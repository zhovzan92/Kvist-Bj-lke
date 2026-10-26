namespace Service.DTOs;

public class UserResponseDto
{
    public string UserId { get; set; } = "";
    public string Username { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string Role { get; set; } = "";
}