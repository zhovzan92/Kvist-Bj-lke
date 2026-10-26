using Infra.Entities;
using Service.DTOs;

namespace Service.Interfaces;

public interface IUserService
{
    public List<UserResponseDto> GetUsers(string callerId);
}