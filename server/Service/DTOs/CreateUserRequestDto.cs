namespace Service.DTOs;

public record CreateUserRequestDto
{
    public string Username { get; set; } = "";
    public string Email { get; set; } = "";
    public string Role { get; set; } = "";

    // Plain text, hashed by the service.
    public string Password { get; set; } = "";
}
