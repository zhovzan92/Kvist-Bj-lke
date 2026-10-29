using System.Net.Mail;
using System.Text.RegularExpressions;
using Service.Exceptions;

namespace Service;

// Input rules for user accounts, checked on the server for every request.
public static partial class UserValidation
{
    public const int UsernameMinLength = 3;
    public const int UsernameMaxLength = 32;
    public const int EmailMaxLength = 254;
    public const int PasswordMinLength = 12;

    // Caps the work spent hashing a single request.
    public const int PasswordMaxLength = 128;

    [GeneratedRegex("^[a-z0-9._-]+$")]
    private static partial Regex UsernamePattern();

    // Returns the username trimmed and lowercased.
    public static string Username(string? value)
    {
        var username = (value ?? "").Trim().ToLowerInvariant();

        if (username.Length < UsernameMinLength || username.Length > UsernameMaxLength)
        {
            throw new BadRequestException(
                $"Username must be {UsernameMinLength}–{UsernameMaxLength} characters.");
        }
        if (!UsernamePattern().IsMatch(username))
        {
            throw new BadRequestException(
                "Username can only contain letters, numbers, dots, dashes and underscores.");
        }
        return username;
    }

    // Returns the email trimmed and lowercased.
    public static string Email(string? value)
    {
        var email = (value ?? "").Trim().ToLowerInvariant();

        if (email.Length > EmailMaxLength ||
            !MailAddress.TryCreate(email, out var parsed) ||
            parsed.Address != email)
        {
            throw new BadRequestException("Enter a valid email address.");
        }
        return email;
    }

    public static string Role(string? value)
    {
        if (value is null || !Roles.All.Contains(value))
        {
            throw new BadRequestException("Role must be User, SuperUser or Admin.");
        }
        return value;
    }

    public static string Password(string? value)
    {
        var password = value ?? "";

        if (password.Length < PasswordMinLength)
        {
            throw new BadRequestException($"Password must be at least {PasswordMinLength} characters.");
        }
        if (password.Length > PasswordMaxLength)
        {
            throw new BadRequestException($"Password can be at most {PasswordMaxLength} characters.");
        }
        return password;
    }
}
