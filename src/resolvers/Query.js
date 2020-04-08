const { forwardTo } = require("prisma-binding");
const { hasPermission } = require("../utils");

const Query = {
  podcasts: forwardTo("db"),
  podcast: forwardTo("db"),
  me(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      return null;
    }
    return ctx.db.query.user(
      {
        where: { id: ctx.request.userId },
      },
      "{id, permissions, email, firstName, lastName}",
      info
    );
  },
  async users(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      throw new Error("You must be logged in");
    }
    hasPermission(ctx.request.user, ["SUPERADMIN"]);

    return ctx.db.query.users({}, info);
  },
  resources: forwardTo("db"),
  resource: forwardTo("db"),
};

module.exports = Query;
