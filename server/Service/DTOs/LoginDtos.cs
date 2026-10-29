namespace Service.DTOs;

public record LoginRequestDto(string Username, string Password);

// The token plus who logged in.
public record LoginResponseDto(string Token, UserResponseDto User);
