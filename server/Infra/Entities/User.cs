using LinqToDB.Mapping;

namespace Infra.Entities;

[Table("User")]
public class User
{
    [PrimaryKey, Identity] public string UserId { get; set; } = "";
    [Column, NotNull] public string Username { get; set; } = "";
    [Column, NotNull] public string PasswordHash { get; set; } = "";
    [Column, NotNull] public string Role { get; set; } = "";
}

