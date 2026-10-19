const { passwordVerfication } = require('@/emailTemplate/emailVerfication');
const { emailVerification } = require('@/emailTemplate/emailVerification');
const { Resend } = require('resend');

const sendMail = async ({
  email,
  name,
  link,
  idurar_app_email,
  subject = 'Verify your email | idurar',
  type = 'emailVerfication',
  emailToken,
}) => {
  const resend = new Resend(process.env.RESEND_API);

  const html =
    type === 'emailVerfication'
      ? emailVerification({ name, link })
      : passwordVerfication({ name, link });

  const { data, error } = await resend.emails.send({
    from: idurar_app_email,
    to: email,
    subject,
    html,
  });

  if (error) {
    throw new Error(error.message || 'Email could not be sent.');
  }

  return data;
};

module.exports = sendMail;
