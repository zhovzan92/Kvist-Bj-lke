using System.Collections.Concurrent;

namespace Service.Security;

// Counts failed logins per username. After MaxFailures within Window, that
// username is locked until the window runs out. Usernames that don't exist are
// tracked the same way, so a lockout never reveals whether an account exists.
// Kept in memory: it resets when the server restarts.
public class LoginAttemptTracker
{
    public const int MaxFailures = 5;
    public static readonly TimeSpan Window = TimeSpan.FromMinutes(15);

    private const int PruneThreshold = 10_000;

    private readonly ConcurrentDictionary<string, Attempts> failures = new();

    private sealed record Attempts(int Count, DateTimeOffset WindowStart);

    public bool IsLockedOut(string username)
    {
        return failures.TryGetValue(username, out var attempts)
               && !IsExpired(attempts)
               && attempts.Count >= MaxFailures;
    }

    public void RecordFailure(string username)
    {
        failures.AddOrUpdate(
            username,
            _ => new Attempts(1, DateTimeOffset.UtcNow),
            (_, attempts) => IsExpired(attempts)
                ? new Attempts(1, DateTimeOffset.UtcNow)
                : attempts with { Count = attempts.Count + 1 });

        if (failures.Count > PruneThreshold)
        {
            foreach (var (key, attempts) in failures)
            {
                if (IsExpired(attempts)) failures.TryRemove(key, out _);
            }
        }
    }

    public void Reset(string username)
    {
        failures.TryRemove(username, out _);
    }

    private static bool IsExpired(Attempts attempts)
    {
        return DateTimeOffset.UtcNow - attempts.WindowStart > Window;
    }
}
