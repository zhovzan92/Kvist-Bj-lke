using System.Collections.Concurrent;

namespace Service.Security;

// Tokens that were logged out before they expired. Each entry is kept until
// the token would have expired anyway. Kept in memory: it resets when the
// server restarts.
public class TokenDenylist
{
    private readonly ConcurrentDictionary<string, DateTimeOffset> revoked = new();

    public void Revoke(string tokenId, DateTimeOffset expiresAt)
    {
        revoked[tokenId] = expiresAt;

        var now = DateTimeOffset.UtcNow;
        foreach (var (id, expiry) in revoked)
        {
            if (expiry <= now) revoked.TryRemove(id, out _);
        }
    }

    public bool IsRevoked(string tokenId)
    {
        return revoked.TryGetValue(tokenId, out var expiry) && expiry > DateTimeOffset.UtcNow;
    }
}
