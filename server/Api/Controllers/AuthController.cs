using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Service;
using Service.DTOs;

namespace Api.Controllers;

[ApiController]
public class AuthController(AuthService authService) : ControllerBase
{
    public const string LoginRateLimit = "login";

    // There is deliberately no Register endpoint: accounts are created by
    // Admins and SuperUsers through UserController.CreateUser.
    [EnableRateLimiting(LoginRateLimit)]
    [ProducesResponseType(typeof(LoginResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status429TooManyRequests)]
    [HttpPost(nameof(Login))]
    public LoginResponseDto Login([FromBody] LoginRequestDto dto)
    {
        return authService.Login(dto);
    }

    // Revokes the caller's token on the server, so it stops working right away
    // instead of when it expires.
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [HttpPost(nameof(Logout))]
    public IActionResult Logout()
    {
        var tokenId = User.FindFirst("jti")?.Value;
        var expires = long.TryParse(User.FindFirst("exp")?.Value, out var exp)
            ? DateTimeOffset.FromUnixTimeSeconds(exp)
            : DateTimeOffset.UtcNow.AddHours(8);

        if (tokenId is not null)
        {
            authService.Logout(tokenId, expires);
        }
        return NoContent();
    }

    [Authorize]
    [ProducesResponseType(typeof(UserResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
    [HttpGet(nameof(GetMe))]
    public UserResponseDto GetMe()
    {
        return authService.GetMe(User.GetUserId());
    }
}
