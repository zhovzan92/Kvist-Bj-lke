using Infra;
using Infra.Entities;
using LinqToDB;
using Microsoft.AspNetCore.Identity;
using Service.DTOs;
using Service.Exceptions;
using Service.Interfaces;

namespace Service;

// Permissions:
//   Admin     - sees and has full CRUD on every user, including other Admins.
//   SuperUser - sees only Users, and has full CRUD on them.
//   User      - sees only Users, and can't change anything.
// An account the caller can't see is treated as if it doesn't exist (404).
// Accounts are only created here, by an Admin or SuperUser. There is no open registration.
public class UserService : IUserService
{
    private readonly DbConnector db;
    private readonly IPasswordHasher<User> passwordHasher;

    public UserService(DbConnector db, IPasswordHasher<User> passwordHasher)
    {
        this.db = db;
        this.passwordHasher = passwordHasher;
    }

    public List<UserResponseDto> GetUsers(string callerId)
    {
        var caller = GetCaller(callerId);
        var visibleRoles = VisibleRoles(caller.Role);

        var users = db.Users()
            .Where(u => visibleRoles.Contains(u.Role))
            .OrderBy(u => u.CreatedAt)
            .ToList();
        return ToDtos(users);
    }

    public UserResponseDto CreateUser(string callerId, CreateUserRequestDto request)
    {
        var caller = GetCaller(callerId);

        // Permission first, so a forbidden request is refused whatever else it contains.
        var role = UserValidation.Role(request.Role);
        if (!CanManage(caller.Role, role))
        {
            throw new ForbiddenException(caller.Role == Roles.User
                ? "You don't have permission to create users."
                : $"You don't have permission to create users with the {role} role.");
        }

        var (username, email) = ValidateDetails(request.Username, request.Email, null);
        var password = UserValidation.Password(request.Password);

        var user = new User
        {
            UserId = Guid.NewGuid().ToString(),
            Username = username,
            Email = email,
            Role = role,
            CreatedAt = DateTime.UtcNow
        };
        user.PasswordHash = passwordHasher.HashPassword(user, password);

        db.Insert(user);
        return ToDto(user);
    }

    public UserResponseDto UpdateUser(string callerId, string userId, UpdateUserRequestDto request)
    {
        var caller = GetCaller(callerId);
        var user = GetVisibleUser(caller, userId);

        // Checked against both the current and the new role, so a SuperUser
        // can't edit an Admin or promote a User to Admin.
        var role = UserValidation.Role(request.Role);
        if (!CanManage(caller.Role, user.Role) || !CanManage(caller.Role, role))
        {
            throw new ForbiddenException("You don't have permission to edit this user.");
        }
        if (user.Role == Roles.Admin && role != Roles.Admin && IsLastAdmin(user))
        {
            throw new BadRequestException("There must always be at least one Admin.");
        }

        var (username, email) = ValidateDetails(request.Username, request.Email, user.UserId);
        // An empty password keeps the existing hash.
        var newPassword = string.IsNullOrEmpty(request.NewPassword)
            ? null
            : UserValidation.Password(request.NewPassword);

        user.Username = username;
        user.Email = email;
        user.Role = role;
        if (newPassword is not null)
        {
            user.PasswordHash = passwordHasher.HashPassword(user, newPassword);
        }

        db.Update(user);
        return ToDto(user);
    }

    public void DeleteUser(string callerId, string userId)
    {
        var caller = GetCaller(callerId);
        var user = GetVisibleUser(caller, userId);

        if (!CanManage(caller.Role, user.Role))
        {
            throw new ForbiddenException("You don't have permission to delete this user.");
        }
        // Also guarantees an Admin always remains, since only Admins can delete Admins.
        if (user.UserId == caller.UserId)
        {
            throw new BadRequestException("You can't delete your own account.");
        }

        db.Users().Where(u => u.UserId == userId).Delete();
    }

    private User GetCaller(string callerId)
    {
        var caller = db.Users().FirstOrDefault(u => u.UserId == callerId)
                     ?? throw new UnauthorizedException("Caller not found.");

        if (!Roles.All.Contains(caller.Role))
        {
            throw new ForbiddenException("Caller role not identified.");
        }
        return caller;
    }

    // The same 404 for an account that doesn't exist and one the caller can't
    // see, so a hidden account's existence isn't revealed.
    private User GetVisibleUser(User caller, string userId)
    {
        var visibleRoles = VisibleRoles(caller.Role);
        return db.Users().FirstOrDefault(u => u.UserId == userId && visibleRoles.Contains(u.Role))
               ?? throw new NotFoundException("User not found.");
    }

    private static string[] VisibleRoles(string callerRole)
    {
        return callerRole == Roles.Admin ? Roles.All : [Roles.User];
    }

    // Returns the username and email normalized to lowercase.
    private (string Username, string Email) ValidateDetails(string? rawUsername, string? rawEmail, string? existingUserId)
    {
        var username = UserValidation.Username(rawUsername);
        var email = UserValidation.Email(rawEmail);

        if (db.Users().Any(u => u.Username == username && u.UserId != existingUserId))
        {
            throw new BadRequestException("That username is already taken.");
        }
        if (db.Users().Any(u => u.Email == email && u.UserId != existingUserId))
        {
            throw new BadRequestException("That email is already in use.");
        }
        return (username, email);
    }

    private bool IsLastAdmin(User user)
    {
        return !db.Users().Any(u => u.Role == Roles.Admin && u.UserId != user.UserId);
    }

    private static bool CanManage(string callerRole, string targetRole)
    {
        return callerRole switch
        {
            Roles.Admin => true,
            Roles.SuperUser => targetRole == Roles.User,
            _ => false
        };
    }

    public static UserResponseDto ToDto(User user)
    {
        return new UserResponseDto
        {
            UserId = user.UserId,
            Username = user.Username,
            Email = user.Email,
            Role = user.Role,
            CreatedAt = DateTime.SpecifyKind(user.CreatedAt, DateTimeKind.Utc)
        };
    }

    private static List<UserResponseDto> ToDtos(List<User> users)
    {
        return users.Select(ToDto).ToList();
    }
}
