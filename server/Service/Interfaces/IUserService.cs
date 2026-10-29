using Service.DTOs;

namespace Service.Interfaces;

public interface IUserService
{
    public List<UserResponseDto> GetUsers(string callerId);

    public UserResponseDto CreateUser(string callerId, CreateUserRequestDto request);

    public UserResponseDto UpdateUser(string callerId, string userId, UpdateUserRequestDto request);

    public void DeleteUser(string callerId, string userId);
}
