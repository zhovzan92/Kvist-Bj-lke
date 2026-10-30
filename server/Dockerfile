# ---------- build ----------
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src

# Restore packages first, so this layer is cached until a .csproj changes.
COPY Api/Api.csproj Api/
COPY Service/Service.csproj Service/
COPY Infra/Infra.csproj Infra/
RUN dotnet restore Api/Api.csproj

COPY . .
RUN dotnet publish Api/Api.csproj -c Release --no-restore -o /app

# ---------- run ----------
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app

# The SQLite database lives in /data, which is mounted as a volume.
RUN mkdir /data && chown app:app /data
ENV ConnectionStrings__Default="Data Source=/data/kvist-bjaelke.db"

COPY --from=build /app .

USER app
EXPOSE 8080
ENTRYPOINT ["dotnet", "Api.dll"]
