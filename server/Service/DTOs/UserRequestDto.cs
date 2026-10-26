namespace Service.DTOs;

public record UserRequestDto
{
    public string Username { get; set; } = "";
    public string PasswordHash { get; set; } = "";
    public string Role { get; set; } = "";
}