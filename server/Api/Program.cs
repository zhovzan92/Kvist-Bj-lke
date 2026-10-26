using System.Globalization;
using System.IdentityModel.Tokens.Jwt;
using System.Text;
using System.Threading.RateLimiting;
using Api;
using Api.Controllers;
using Api.Seeding;
using Infra;
using Infra.Entities;
using LinqToDB;
using LinqToDB.Data;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.IdentityModel.Tokens;
using NSwag;
using NSwag.Generation.Processors.Security;
using Service;
using Service.Interfaces;
using Service.Security;

CultureInfo.DefaultThreadCurrentCulture = CultureInfo.InvariantCulture;

var builder = WebApplication.CreateBuilder(args);

// ---------- database ----------
var connectionString = builder.Configuration.GetConnectionString("Default")
                       ?? throw new InvalidOperationException("ConnectionStrings:Default is not configured");
var dbOptions = new DataOptions<DbConnector>(new DataOptions().UseSQLite(connectionString));

builder.Services.AddScoped<DbConnector>(_ => new DbConnector(dbOptions));

builder.Services.AddSingleton<IPasswordHasher<User>, PasswordHasher<User>>();
builder.Services.AddScoped<IUserService, UserService>();
builder.Services.AddScoped<AuthService>();
builder.Services.AddSingleton<LoginAttemptTracker>();
builder.Services.AddSingleton<TokenDenylist>();

// ---------- error handling ----------
builder.Services.AddExceptionHandler<GlobalExceptionHandler>();
builder.Services.AddProblemDetails();

// ---------- controllers / swagger / cors ----------
builder.Services.AddControllers();
builder.Services.AddCors();

// Only the client app may call the API from a browser.
var allowedOrigins = builder.Configuration.GetSection("Cors:Origins").Get<string[]>() ?? ["http://localhost:3000"];

builder.Services.AddOpenApiDocument(c =>
{
    c.Title = "Kvist & Bjælke API";
    c.AddSecurity("JWT", new OpenApiSecurityScheme
    {
        Type = OpenApiSecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });
    c.OperationProcessors.Add(new AspNetCoreOperationSecurityScopeProcessor("JWT"));
});

// ---------- JWT ----------
var jwtSecret = builder.Configuration["Jwt:Secret"];
if (string.IsNullOrWhiteSpace(jwtSecret) || Encoding.UTF8.GetByteCount(jwtSecret) < 32)
{
    throw new InvalidOperationException(
        "Jwt:Secret must be set to at least 32 characters, e.g. with the Jwt__Secret environment variable.");
}
var jwt = new JwtSettings(
    jwtSecret,
    builder.Configuration["Jwt:Issuer"] ?? "kvist-bjaelke",
    builder.Configuration["Jwt:Audience"] ?? "kvist-bjaelke-client");
builder.Services.AddSingleton(jwt);
builder.Services.AddSingleton<TokenService>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(o =>
    {
        o.MapInboundClaims = false;
        o.TokenValidationParameters = new TokenValidationParameters
        {
            ValidateIssuer = true,
            ValidIssuer = jwt.Issuer,
            ValidateAudience = true,
            ValidAudience = jwt.Audience,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwt.Secret)),
            RoleClaimType = "role",
            NameClaimType = JwtRegisteredClaimNames.UniqueName
        };
    });

builder.Services.AddAuthorization();

// ---------- rate limiting ----------
// Slows down password guessing from one place: by default 10 login attempts
// per minute per IP address. LoginAttemptTracker also locks a single username
// after repeated failures, whichever addresses they come from.
var loginsPerMinute = builder.Configuration.GetValue("RateLimit:LoginPerMinute", 10);
builder.Services.AddRateLimiter(o =>
{
    o.AddPolicy(AuthController.LoginRateLimit, context =>
        RateLimitPartition.GetFixedWindowLimiter(
            context.Connection.RemoteIpAddress?.ToString() ?? "unknown",
            _ => new FixedWindowRateLimiterOptions { PermitLimit = loginsPerMinute, Window = TimeSpan.FromMinutes(1) }));

    o.OnRejected = async (context, cancellationToken) =>
    {
        context.HttpContext.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        await context.HttpContext.Response.WriteAsJsonAsync(new ProblemDetails
        {
            Status = StatusCodes.Status429TooManyRequests,
            Title = "Too Many Requests",
            Detail = "Too many sign-in attempts. Wait a minute and try again."
        }, cancellationToken);
    };
});

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<DbConnector>();
    db.CreateTable<User>(tableOptions: TableOptions.CreateIfNotExists);

    var adminUsername = app.Configuration["Admin:Username"] ?? "admin";
    var adminEmail = app.Configuration["Admin:Email"] ?? "admin@example.com";
    var adminPassword = app.Configuration["Admin:Password"]
                        ?? throw new InvalidOperationException("Admin:Password is not configured");
    scope.ServiceProvider.GetRequiredService<AuthService>().SeedAdmin(adminUsername, adminEmail, adminPassword);

    if (app.Configuration.GetValue("Seed:Enabled", false))
    {
        DatabaseSeeder.Seed(
            db,
            scope.ServiceProvider.GetRequiredService<IPasswordHasher<User>>(),
            app.Configuration["Seed:Password"] ?? adminPassword,
            app.Logger);
    }
}

app.Use(async (context, next) =>
{
    var headers = context.Response.Headers;
    headers["X-Content-Type-Options"] = "nosniff";
    headers["X-Frame-Options"] = "DENY";
    headers["Referrer-Policy"] = "no-referrer";
    await next();
});

app.UseCors(config => config
    .WithOrigins(allowedOrigins)
    .AllowAnyHeader()
    .AllowAnyMethod());

// The API description is only served in development, where the client is generated from it.
if (app.Environment.IsDevelopment())
{
    app.UseOpenApi();
    app.UseSwaggerUi();
}

app.UseAuthentication();

// Refuse a token that was logged out, or whose user has since been deleted.
app.Use(async (context, next) =>
{
    var userId = context.User.FindFirst("sub")?.Value;
    if (userId is not null)
    {
        var tokenId = context.User.FindFirst("jti")?.Value;
        var denylist = context.RequestServices.GetRequiredService<TokenDenylist>();
        var db = context.RequestServices.GetRequiredService<DbConnector>();

        if (tokenId is null || denylist.IsRevoked(tokenId) || !db.Users().Any(u => u.UserId == userId))
        {
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            await context.Response.WriteAsJsonAsync(new ProblemDetails
            {
                Status = StatusCodes.Status401Unauthorized,
                Title = "Unauthorized",
                Detail = "Your session is no longer valid. Log in again."
            });
            return;
        }
    }

    await next();
});

app.UseAuthorization();
app.UseRateLimiter();

app.MapControllers();

app.Run();
