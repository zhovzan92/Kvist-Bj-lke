using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Service.DTOs;
using Service.Interfaces;

namespace Api.Controllers;

// Any logged-in user may call these. UserService checks the caller's role
// on every request, so hiding buttons in the client is never the only guard.
[ApiController]
[Authorize]
[ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status401Unauthorized)]
[ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status403Forbidden)]
public class UserController(IUserService service) : ControllerBase
{
    [ProducesResponseType(typeof(List<UserResponseDto>), StatusCodes.Status200OK)]
    [HttpGet(nameof(GetUsers))]
    public List<UserResponseDto> GetUsers()
    {
        return service.GetUsers(User.GetUserId());
    }

    [ProducesResponseType(typeof(UserResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [HttpPost(nameof(CreateUser))]
    public UserResponseDto CreateUser([FromBody] CreateUserRequestDto dto)
    {
        return service.CreateUser(User.GetUserId(), dto);
    }

    [ProducesResponseType(typeof(UserResponseDto), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [HttpPut(nameof(UpdateUser))]
    public UserResponseDto UpdateUser(string userId, [FromBody] UpdateUserRequestDto dto)
    {
        return service.UpdateUser(User.GetUserId(), userId, dto);
    }

    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [HttpDelete(nameof(DeleteUser))]
    public IActionResult DeleteUser(string userId)
    {
        service.DeleteUser(User.GetUserId(), userId);
        return NoContent();
    }
}
