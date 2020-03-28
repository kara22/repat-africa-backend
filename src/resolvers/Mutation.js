const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { randomBytes } = require("crypto");
const { promisify } = require("util");
const { transport, niceEmail, makeANiceEmail } = require("../mail");

const Mutations = {
  async createPodcast(parent, args, ctx, info) {
    if (!ctx.request.userId) {
      throw new Error("You must be logged to create a podcast");
    }
    const podcast = await ctx.db.mutation.createPodcast(
      {
        data: {
          // create the relation ship between the podcast and the user
          user: {
            connect: {
              id: ctx.request.userId
            }
          },
          ...args
        }
      },
      info
    );
    return podcast;
  },
  updatePodcast(parent, args, ctx, info) {
    // first take a copy of the updates
    const updates = { ...args };

    // remove the ID from the updatesflum
    delete updates.id;
    // run the update method
    return ctx.db.mutation.updatePodcast(
      {
        data: updates,
        where: {
          id: args.id
        }
      },
      info
    );
  },

  async deletePodcast(parent, args, ctx, info) {
    const where = { id: args.id };
    const podcast = await ctx.db.query.podcast({ where }, `{ id title}`);
    return ctx.db.mutation.deletePodcast({ where }, info);
  },

  async signup(parent, args, ctx, info) {
    args.email = args.email.toLowerCase();
    const SALT = 10;
    const password = await bcrypt.hash(args.password, SALT);
    const user = await ctx.db.mutation.createUser(
      {
        data: {
          ...args,
          password
        }
      },
      info
    );
    const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);
    ctx.response.cookie("token", token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365
    });
    return user;
  },

  async signin(parent, { email, password }, ctx, info) {
    const user = await ctx.db.query.user({ where: { email } });
    if (!user) {
      throw new Error(`No such user found for ${email}`);
    }
    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      throw new Error(`Invalid password`);
    }

    const token = jwt.sign({ userId: user.id }, process.env.APP_SECRET);
    ctx.response.cookie("token", token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365
    });
    return user;
  },
  signout(parent, args, ctx, info) {
    ctx.response.clearCookie("token");
    return { message: "Goodbye !" };
  },
  async requestReset(parent, args, ctx, info) {
    const user = await ctx.db.query.user({ where: { email: args.email } });

    if (!user) {
      throw new Error(`No such user found for ${args.email}`);
    }
    const randomBytesPromisified = promisify(randomBytes);
    const resetToken = (await randomBytesPromisified(20)).toString("hex");
    const resetTokenExpiry = (Date.now() + 3600000).toString();

    const res = await ctx.db.mutation.updateUser({
      where: { email: args.email },
      data: { resetToken, resetTokenExpiry }
    });

    const mailRes = await transport.sendMail({
      from: "admin@repat.africa",
      to: user.email,
      subject: "Your password reset token",
      html: makeANiceEmail(
        `Your password reset token is here \n\n 
        <a href="${process.env.FRONTEND_URL}/user/reset?resetToken=${resetToken}">Click here to reset</a>`
      )
    });

    return { message: "Thanks!" };
  },

  async resetPassword(parent, args, ctx, info) {
    if (args.password !== args.confirmPassword) {
      throw new Error(`Your passwords don't match`);
    }
    const [user] = await ctx.db.query.users({
      where: {
        resetToken: args.resetToken,
        resetTokenExpiry_gte: (Date.now() - 3600000).toString()
      }
    });

    if (!user) {
      throw new Error(`The token is either invalid or expired`);
    }

    const password = await bcrypt.hash(args.password, 10);
    const updatedUser = await ctx.db.mutation.updateUser({
      where: { email: user.email },
      data: {
        password,
        resetToken: null,
        resetTokenExpiry: null
      }
    });

    const token = jwt.sign({ userId: updatedUser.id }, process.env.APP_SECRET);
    ctx.response.cookie("token", token, {
      httpOnly: true,
      maxAge: 1000 * 60 * 60 * 24 * 365
    });

    return updatedUser;
  }
};

module.exports = Mutations;
