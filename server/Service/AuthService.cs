using Infra;
using Infra.Entities;
using LinqToDB;
using Microsoft.AspNetCore.Identity;
using Service.DTOs;
using Service.Exceptions;
using Service.Security;

namespace Service;

public class AuthService(
    DbConnector db,
    TokenService tokenService,
    IPasswordHasher<User> passwordHasher,
    LoginAttemptTracker loginAttempts,
    TokenDenylist tokenDenylist)
{
    // The same message for an unknown username and a wrong password, so a
    // failed login never reveals whether an account exists.
    private const string InvalidCredentials = "That username and password don't match.";

    // Checked when the username doesn't exist, so that case costs the same
    // hashing time as a wrong password for a real account.
    private static readonly User DummyUser = new();
    private static readonly string DummyHash =
        new PasswordHasher<User>().HashPassword(DummyUser, Guid.NewGuid().ToString());

    public LoginResponseDto Login(LoginRequestDto dto)
    {
        var username = (dto.Username ?? "").Trim().ToLowerInvariant();
        var password = dto.Password ?? "";

        if (loginAttempts.IsLockedOut(username))
        {
            throw new TooManyRequestsException(
                $"Too many failed sign-in attempts. Try again in {LoginAttemptTracker.Window.TotalMinutes:0} minutes.");
        }

        var user = db.Users().FirstOrDefault(u => u.Username == username);

        // Over-long passwords are never valid and are not hashed.
        var result = password.Length > UserValidation.PasswordMaxLength
            ? PasswordVerificationResult.Failed
            : passwordHasher.VerifyHashedPassword(user ?? DummyUser, user?.PasswordHash ?? DummyHash, password);

        if (user is null || result == PasswordVerificationResult.Failed)
        {
            loginAttempts.RecordFailure(username);
            throw new UnauthorizedException(InvalidCredentials);
        }

        loginAttempts.Reset(username);

        // Upgrade hashes made with older hashing settings.
        if (result == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = passwordHasher.HashPassword(user, password);
            db.Update(user);
        }

        return new LoginResponseDto(tokenService.CreateToken(user), UserService.ToDto(user));
    }

    public void Logout(string tokenId, DateTimeOffset expiresAt)
    {
        tokenDenylist.Revoke(tokenId, expiresAt);
    }

    public UserResponseDto GetMe(string userId)
    {
        var user = db.Users().FirstOrDefault(u => u.UserId == userId)
                   ?? throw new UnauthorizedException("Your session is no longer valid. Log in again.");
        return UserService.ToDto(user);
    }

    // Creates the first Admin so someone can log in on a fresh database.
    public void SeedAdmin(string username, string email, string password)
    {
        if (db.Users().Any(u => u.Role == Roles.Admin))
        {
            return;
        }

        var admin = new User
        {
            UserId = Guid.NewGuid().ToString(),
            Username = UserValidation.Username(username),
            Email = UserValidation.Email(email),
            Role = Roles.Admin,
            CreatedAt = DateTime.UtcNow
        };
        admin.PasswordHash = passwordHasher.HashPassword(admin, UserValidation.Password(password));
        db.Insert(admin);
    }
}
