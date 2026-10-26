using System.Globalization;
using Infra;
using Infra.Entities;
using LinqToDB;
using NSwag;
using NSwag.Generation.Processors.Security;
using Service;
using Service.Interfaces;

CultureInfo.DefaultThreadCurrentCulture = CultureInfo.InvariantCulture;

var builder = WebApplication.CreateBuilder(args);

// ---------- database ----------
var connectionString = builder.Configuration.GetConnectionString("Default")
                       ?? "Data Source=db.db;Foreign Keys=True";
var options = new DataOptions().UseSQLite(connectionString);
var dbConnectorOptions = new DataOptions<DbConnector>(options);

builder.Services.AddScoped<DbConnector>(_ => new DbConnector(dbConnectorOptions));
builder.Services.AddScoped<IUserService, UserService>();

// ---------- controllers / swagger / cors ----------
builder.Services.AddControllers();
builder.Services.AddProblemDetails();
builder.Services.AddCors();

builder.Services.AddOpenApiDocument(c =>
{
    c.AddSecurity("JWT", new OpenApiSecurityScheme
    {
        Type = OpenApiSecuritySchemeType.Http,
        Scheme = "bearer",
        BearerFormat = "JWT"
    });
    c.OperationProcessors.Add(new AspNetCoreOperationSecurityScopeProcessor("JWT"));
});

// ---------- JWT (add back later) ----------

var app = builder.Build();

app.UseExceptionHandler();
app.UseStatusCodePages();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<DbConnector>();
    db.CreateTable<User>(tableOptions: TableOptions.CreateIfNotExists);
}

app.UseCors(config => config
    .AllowAnyHeader()
    .AllowAnyMethod()
    .SetIsOriginAllowed(_ => true));

app.UseOpenApi();
app.UseSwaggerUi();

app.MapControllers();

app.Run();