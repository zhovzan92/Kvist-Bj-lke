using LinqToDB.Mapping;

namespace Infra.Entities;

[Table("User")]
public class User
{
    // A GUID string. SQLite can only auto-generate integer keys.
    [PrimaryKey] public string UserId { get; set; } = "";
    [Column, NotNull] public string Username { get; set; } = "";
    [Column, NotNull] public string Email { get; set; } = "";
    [Column, NotNull] public string PasswordHash { get; set; } = "";
    [Column, NotNull] public string Role { get; set; } = "";
    [Column, NotNull] public DateTime CreatedAt { get; set; }
}
