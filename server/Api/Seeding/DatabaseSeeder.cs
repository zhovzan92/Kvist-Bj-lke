using Infra;
using Infra.Entities;
using LinqToDB;
using Microsoft.AspNetCore.Identity;
using Service;

namespace Api.Seeding;

// Sample users for local development, so the dashboard has something to show.
// Only runs when Seed:Enabled is true and the admin is the only user.
public static class DatabaseSeeder
{
    private static readonly (string Username, string Role, string CreatedAt)[] SampleUsers =
    [
        ("jonas.holm", Roles.Admin, "2025-03-12"),
        ("sofie.lund", Roles.SuperUser, "2025-04-02"),
        ("anders.nielsen", Roles.SuperUser, "2025-05-19"),
        ("freja.madsen", Roles.User, "2025-06-07"),
        ("ida.pedersen", Roles.User, "2025-08-11"),
        ("lars.thomsen", Roles.User, "2025-09-23"),
        ("mikkel.jensen", Roles.User, "2025-11-04"),
        ("emma.larsen", Roles.User, "2026-01-15"),
        ("noah.sorensen", Roles.User, "2026-02-02"),
        ("clara.rasmussen", Roles.User, "2026-03-28"),
        ("oscar.andersen", Roles.User, "2026-05-09"),
        ("alma.christensen", Roles.User, "2026-07-21"),
        ("viktor.poulsen", Roles.User, "2026-10-24")
    ];

    public static void Seed(DbConnector db, IPasswordHasher<User> passwordHasher, string password, ILogger logger)
    {
        if (db.Users().Count() > 1)
        {
            return;
        }

        password = UserValidation.Password(password);

        foreach (var (username, role, createdAt) in SampleUsers)
        {
            var user = new User
            {
                UserId = Guid.NewGuid().ToString(),
                Username = username,
                Email = $"{username}@example.com",
                Role = role,
                CreatedAt = DateTime.SpecifyKind(DateTime.Parse(createdAt), DateTimeKind.Utc)
            };
            user.PasswordHash = passwordHasher.HashPassword(user, password);
            db.Insert(user);
        }

        logger.LogInformation("Seeded {Count} sample users", SampleUsers.Length);
    }
}
