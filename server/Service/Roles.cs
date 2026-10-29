namespace Service;

public static class Roles
{
    public const string User = "User";
    public const string SuperUser = "SuperUser";
    public const string Admin = "Admin";

    public static readonly string[] All = [User, SuperUser, Admin];
}
