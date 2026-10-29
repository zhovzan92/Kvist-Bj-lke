namespace Service.DTOs;

// The password hash is never sent to the client.
public class UserResponseDto
{
    public string UserId { get; set; } = "";
    public string Username { get; set; } = "";
    public string Email { get; set; } = "";
    public string Role { get; set; } = "";
    public DateTime CreatedAt { get; set; }
}
