exports.emailVerification = ({ name = '', link = '' }) => {
  const safeName = String(name).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[char]));

  const safeLink = String(link).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return `
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Verify your email | Bizora</title>
      </head>
      <body style="margin:0;padding:24px;background:#f4f7fb;font-family:Arial,Helvetica,sans-serif;color:#172033;">
        <div style="max-width:560px;margin:0 auto;padding:32px;background:#ffffff;border:1px solid #e5eaf2;border-radius:12px;">
          <h1 style="margin:0 0 24px;color:#155eef;font-size:26px;">Bizora</h1>
          <h2 style="margin:0 0 16px;font-size:22px;">Verify your email address</h2>
          <p style="font-size:15px;line-height:1.7;">Hello ${safeName},</p>
          <p style="font-size:15px;line-height:1.7;">Thanks for creating your Bizora account. Please verify your email address to activate your account.</p>
          <p style="margin:28px 0;">
            <a href="${safeLink}" style="display:inline-block;padding:12px 22px;background:#155eef;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">Verify email</a>
          </p>
          <p style="font-size:13px;line-height:1.7;color:#5d687b;">If the button doesn't work, copy and paste this link into your browser:</p>
          <p style="font-size:13px;line-height:1.7;overflow-wrap:anywhere;"><a href="${safeLink}" style="color:#155eef;">${safeLink}</a></p>
          <hr style="margin:28px 0;border:0;border-top:1px solid #e5eaf2;" />
          <p style="font-size:12px;line-height:1.6;color:#7b8494;">If you didn't create a Bizora account, you can ignore this email.</p>
        </div>
      </body>
    </html>
  `;
};
