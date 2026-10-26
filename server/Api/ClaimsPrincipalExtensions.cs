using System.Security.Claims;
using Microsoft.IdentityModel.JsonWebTokens;

namespace Api;

public static class ClaimsPrincipalExtensions
{
    public static string GetUserId(this ClaimsPrincipal user) =>
        user.FindFirstValue(JwtRegisteredClaimNames.Sub)!;
}
