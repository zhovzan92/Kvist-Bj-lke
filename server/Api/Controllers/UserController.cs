using Service.DTOs;
using Service.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Api.Controllers;

[ApiController]
[Authorize]
public class UserController(IUserService service) : ControllerBase
{
    [HttpGet(nameof(GetUsers))]
    public List<UserResponseDto> GetUsers(string callerId)
    {
        return service.GetUsers(callerId);
    }
}