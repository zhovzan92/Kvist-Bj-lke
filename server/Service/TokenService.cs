using System.Security.Claims;
using System.Text;
using Infra.Entities;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace Service;

public record JwtSettings(string Secret, string Issuer, string Audience);

// Creates the JWT a user gets back after logging in. The API reads the
// "sub" claim on every request to know who the caller is.
public class TokenService(JwtSettings settings)
{
    public string CreateToken(User user)
    {
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(settings.Secret));

        return new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
        {
            Subject = new ClaimsIdentity([
                new Claim(JwtRegisteredClaimNames.Sub, user.UserId),
                // A unique id per token, so logging out can revoke this one token.
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim(JwtRegisteredClaimNames.UniqueName, user.Username),
                new Claim("role", user.Role)
            ]),
            Issuer = settings.Issuer,
            Audience = settings.Audience,
            Expires = DateTime.UtcNow.AddHours(8),
            SigningCredentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256)
        });
    }
}
