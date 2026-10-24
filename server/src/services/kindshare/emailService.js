import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({

  service: "gmail",

  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD
  }

});


/* -----------------------------
EMAIL VERIFICATION
------------------------------*/

export const sendVerificationEmail = async (email, ngoId) => {

  const verifyLink =
    `http://localhost:3000/api/kindshare/ngos/verify/${ngoId}`;

  const mailOptions = {

    from: process.env.EMAIL_USERNAME,

    to: email,

    subject: "Verify your NGO email",

    html: `
      <h2>KindShare Email Verification</h2>

      <p>Please verify your email by clicking the link below:</p>

      <a href="${verifyLink}">
        Verify Email
      </a>

      <p>This step is required before admin approval.</p>
    `
  };

  await transporter.sendMail(mailOptions);

};


/* -----------------------------
NGO APPROVED EMAIL
------------------------------*/

export const sendApprovalEmail = async (email, ngoName) => {

  const mailOptions = {

    from: process.env.EMAIL_USERNAME,

    to: email,

    subject: "Your NGO has been approved 🎉",

    html: `
      <h2>Congratulations!</h2>

      <p>Your NGO <b>${ngoName}</b> has been approved by the KindShare admin.</p>

      <p>You can now login and manage donations.</p>
    `
  };

  await transporter.sendMail(mailOptions);

};


/* -----------------------------
NGO REJECTED EMAIL
------------------------------*/

export const sendRejectionEmail = async (email, ngoName) => {

  const mailOptions = {

    from: process.env.EMAIL_USERNAME,

    to: email,

    subject: "NGO Registration Update",

    html: `
      <h2>NGO Registration Update</h2>

      <p>We regret to inform you that your NGO <b>${ngoName}</b> was not approved.</p>
    `
  };

  await transporter.sendMail(mailOptions);

};
export const sendDonationStatusEmail = async (email, name, status) => {

  let message = "";

  if (status === "accepted") {

    message = "Your donation has been accepted by the NGO. Thank you for your kindness!";

  } else if (status === "rejected") {

    message = "Unfortunately your donation was rejected by the NGO.";

  }

  await transporter.sendMail({

    from: process.env.EMAIL_USER,
    to: email,
    subject: "Donation Status Update",

    html: `
      <h2>Hello ${name}</h2>
      <p>${message}</p>
      <p>Thank you for using KindShare.</p>
    `

  });

};
export const sendReceiverStatusEmail = async (email, name, status) => {

  let message = "";

  if (status === "accepted") {
    message = "Your request has been accepted. The NGO will contact you for pickup.";
  }

  else if (status === "rejected") {
    message = "Your request has been rejected by the NGO.";
  }

  else if (status === "donated") {
    message = "The item has been marked as donated. Thank you.";
  }

  await transporter.sendMail({

    from: process.env.EMAIL_USER,
    to: email,
    subject: "KindShare Request Update",

    html: `
      <h2>Hello ${name}</h2>
      <p>${message}</p>
      <p>Thank you for using KindShare.</p>
    `
  });

};