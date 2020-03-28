const nodemailer = require("nodemailer");
const mjml = require("mjml");

const transport = nodemailer.createTransport({
  host: process.env.MAIL_HOST,
  port: process.env.MAIL_PORT,
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS
  }
});

const niceEmail = text =>
  mjml(
    `
  <mjml>
    <mj-body>
      <mj-section>
        <mj-column>
          <mj-text>
            Hello There!
            ${text}
          </mj-text>
        </mj-column>
      </mj-section>
    </mj-body>
  </mjml>
`
  );

const makeANiceEmail = text => `
  <div class="email">
  <h2>Hi there !</h2>
    ${text}
  </div>
`;

exports.transport = transport;
exports.niceEmail = niceEmail;
exports.makeANiceEmail = makeANiceEmail;
