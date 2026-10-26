using Infra;
using Infra.Entities;
using Service.DTOs;
using Service.Interfaces;

namespace Service;

public class UserService : IUserService
{
    private readonly DbConnector db;

    public UserService(DbConnector db)
    {
        this.db = db;
    }
    
    public List<UserResponseDto> GetUsers(string callerId)
    {
        var caller = db.Users().FirstOrDefault(u => u.UserId == callerId)
                     ?? throw new UnauthorizedAccessException("Caller not found.");

        if (caller.Role == "User" || caller.Role == "SuperUser")
        {
            var users = db.Users().Where(u => u.Role == "User").ToList();
            return ToDtos(users);
        }
        if (caller.Role == "Admin")
        {
            var users = db.Users().ToList();
            return ToDtos(users);
        }
        
        throw new UnauthorizedAccessException("Caller role not identified.");
    }

    private UserResponseDto ToDto(User user)
    {
        return new UserResponseDto
        {
            UserId = user.UserId,
            Username = user.Username,
            PasswordHash = user.PasswordHash,
            Role = user.Role
        };
    }

    private List<UserResponseDto> ToDtos(List<User> users)
    {
        return users.Select(ToDto).ToList();
    }
}