namespace Service.DTOs;

public record UpdateUserRequestDto
{
    public string Username { get; set; } = "";
    public string Email { get; set; } = "";
    public string Role { get; set; } = "";

    // Plain text, hashed by the service. Leave empty to keep the current password.
    public string? NewPassword { get; set; }
}
