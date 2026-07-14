import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'
import fs from 'fs'
import path from 'path'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const { to, subject, body, attachment } = await request.json()

  if (!to || typeof to !== 'string') {
    return NextResponse.json({ error: 'Recipient email is required' }, { status: 400 })
  }

  const host = process.env.SMTP_HOST
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.SMTP_FROM || user

  const mailOptions: nodemailer.SendMailOptions = {
    from: from || 'noreply@example.com',
    to,
    subject: subject || 'Performance Report',
    text: body || 'Please find the attached performance report.',
  }

  if (attachment?.data && attachment?.filename) {
    mailOptions.attachments = [{
      filename: attachment.filename,
      content: Buffer.from(attachment.data, 'base64'),
      encoding: 'base64',
    }]
  }

  if (host && user && pass) {
    try {
      const transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: { user, pass },
      })
      await transporter.sendMail(mailOptions)
      return NextResponse.json({ ok: true })
    } catch (error) {
      console.error('Failed to send email:', error)
      return NextResponse.json({ error: 'Failed to send email' }, { status: 500 })
    }
  }

  // Dev mode: save to disk so the user can test the flow without SMTP.
  const dir = path.join(process.cwd(), 'public', 'emails')
  fs.mkdirSync(dir, { recursive: true })
  const stamp = Date.now()
  const meta = { to, subject, body, filename: attachment?.filename, sentAt: new Date().toISOString() }
  fs.writeFileSync(path.join(dir, `${stamp}.json`), JSON.stringify(meta, null, 2))
  if (attachment?.data) {
    const buf = Buffer.from(attachment.data, 'base64')
    fs.writeFileSync(path.join(dir, `${stamp}-${attachment.filename}`), buf)
  }
  console.log(`[email] Saved to public/emails/${stamp}.json (SMTP not configured — dev mode)`)

  return NextResponse.json({ ok: true, dev: true, message: `Email saved locally (SMTP not configured). Configure SMTP_HOST, SMTP_USER, SMTP_PASS in .env for live sending.` })
}
