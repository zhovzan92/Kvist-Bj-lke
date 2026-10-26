using Infra.Entities;
using LinqToDB;
using LinqToDB.Data;

namespace Infra;

public class DbConnector(DataOptions<DbConnector> dataOptions) : DataConnection(dataOptions.Options)
{
    public ITable<User> Users()
    {
        return this.GetTable<User>();
    }
}