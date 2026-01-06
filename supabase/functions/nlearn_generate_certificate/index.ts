// =====================================================
// NLearn Platform - Certificate Generator
// =====================================================
// Generates PDF certificates for course completion
// - Called when certification is approved
// - Generates styled PDF with user info
// - Uploads to nlearn_certificates bucket
// - Updates certification record with URL
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { PDFDocument, rgb, StandardFonts } from 'https://esm.sh/pdf-lib@1.17.1'
import { supabaseAdmin, jsonResponse, errorResponse, corsHeaders } from '../_shared/supabase.ts'

interface CertificateRequest {
  certification_id: string
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { certification_id } = await req.json() as CertificateRequest

    // Get certification details
    const { data: cert, error: certError } = await supabaseAdmin
      .from('certifications')
      .select(`
        *,
        user:profiles(full_name, email),
        course:courses(title, description)
      `)
      .eq('id', certification_id)
      .single()

    if (certError || !cert) {
      return errorResponse('Certification not found', 404)
    }

    if (cert.status !== 'approved') {
      return errorResponse('Certification not approved', 400)
    }

    // Generate PDF
    const pdfBytes = await generateCertificatePDF({
      userName: cert.user.full_name || cert.user.email,
      courseName: cert.course.title,
      certificateNumber: cert.certificate_number,
      approvedAt: new Date(cert.reviewed_at)
    })

    // Upload to storage
    const fileName = `${cert.user_id}/${cert.certificate_number}.pdf`
    const { error: uploadError } = await supabaseAdmin.storage
      .from('nlearn_certificates')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true
      })

    if (uploadError) throw uploadError

    // Get signed URL (valid for 7 days)
    const { data: urlData } = await supabaseAdmin.storage
      .from('nlearn_certificates')
      .createSignedUrl(fileName, 60 * 60 * 24 * 7)

    // Update certification with URL
    await supabaseAdmin
      .from('certifications')
      .update({ certificate_url: urlData?.signedUrl })
      .eq('id', certification_id)

    // Send notification
    await supabaseAdmin.from('notifications').insert({
      user_id: cert.user_id,
      type: 'completion',
      channel: 'email',
      title: '🎉 修了証が発行されました',
      body: `「${cert.course.title}」の修了証が発行されました。ダウンロードしてご確認ください。`,
      data: {
        certification_id,
        certificate_url: urlData?.signedUrl
      }
    })

    return jsonResponse({
      success: true,
      certificate_url: urlData?.signedUrl,
      certificate_number: cert.certificate_number
    })

  } catch (err) {
    console.error('Certificate generation error:', err)
    return errorResponse('Certificate generation failed', 500)
  }
})

interface CertificateData {
  userName: string
  courseName: string
  certificateNumber: string
  approvedAt: Date
}

async function generateCertificatePDF(data: CertificateData): Promise<Uint8Array> {
  // Create PDF document (A4 landscape)
  const pdfDoc = await PDFDocument.create()
  const page = pdfDoc.addPage([841.89, 595.28]) // A4 landscape

  // Load fonts
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica)

  const { width, height } = page.getSize()

  // Colors
  const primaryColor = rgb(0.31, 0.27, 0.9) // #4F46E5
  const textColor = rgb(0.2, 0.2, 0.2)
  const grayColor = rgb(0.5, 0.5, 0.5)

  // Border
  page.drawRectangle({
    x: 30,
    y: 30,
    width: width - 60,
    height: height - 60,
    borderColor: primaryColor,
    borderWidth: 3,
  })

  // Inner border
  page.drawRectangle({
    x: 40,
    y: 40,
    width: width - 80,
    height: height - 80,
    borderColor: primaryColor,
    borderWidth: 1,
  })

  // Header - "Certificate of Completion"
  const titleText = '修 了 証'
  const titleWidth = helveticaBold.widthOfTextAtSize(titleText, 48)
  page.drawText(titleText, {
    x: (width - titleWidth) / 2,
    y: height - 120,
    size: 48,
    font: helveticaBold,
    color: primaryColor,
  })

  // Certificate subtitle
  const subtitleText = 'CERTIFICATE OF COMPLETION'
  const subtitleWidth = helvetica.widthOfTextAtSize(subtitleText, 14)
  page.drawText(subtitleText, {
    x: (width - subtitleWidth) / 2,
    y: height - 150,
    size: 14,
    font: helvetica,
    color: grayColor,
  })

  // "This is to certify that"
  const certifyText = 'この証明書は、以下の方が下記コースを修了したことを証明します。'
  const certifyWidth = helvetica.widthOfTextAtSize(certifyText, 12)
  page.drawText(certifyText, {
    x: (width - certifyWidth) / 2,
    y: height - 200,
    size: 12,
    font: helvetica,
    color: textColor,
  })

  // User name
  const nameWidth = helveticaBold.widthOfTextAtSize(data.userName, 36)
  page.drawText(data.userName, {
    x: (width - nameWidth) / 2,
    y: height - 260,
    size: 36,
    font: helveticaBold,
    color: textColor,
  })

  // Underline for name
  page.drawLine({
    start: { x: (width - 400) / 2, y: height - 275 },
    end: { x: (width + 400) / 2, y: height - 275 },
    thickness: 1,
    color: grayColor,
  })

  // "has successfully completed"
  const completedText = '修了コース'
  const completedWidth = helvetica.widthOfTextAtSize(completedText, 12)
  page.drawText(completedText, {
    x: (width - completedWidth) / 2,
    y: height - 320,
    size: 12,
    font: helvetica,
    color: grayColor,
  })

  // Course name
  const courseWidth = helveticaBold.widthOfTextAtSize(data.courseName, 24)
  page.drawText(data.courseName, {
    x: (width - courseWidth) / 2,
    y: height - 360,
    size: 24,
    font: helveticaBold,
    color: primaryColor,
  })

  // Date
  const dateStr = data.approvedAt.toLocaleDateString('ja-JP', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
  const dateText = `発行日: ${dateStr}`
  const dateWidth = helvetica.widthOfTextAtSize(dateText, 12)
  page.drawText(dateText, {
    x: (width - dateWidth) / 2,
    y: 120,
    size: 12,
    font: helvetica,
    color: textColor,
  })

  // Certificate number
  const certNumText = `証明書番号: ${data.certificateNumber}`
  const certNumWidth = helvetica.widthOfTextAtSize(certNumText, 10)
  page.drawText(certNumText, {
    x: (width - certNumWidth) / 2,
    y: 80,
    size: 10,
    font: helvetica,
    color: grayColor,
  })

  // Organization
  const orgText = 'NLearn - AI活用人材育成プラットフォーム'
  const orgWidth = helvetica.widthOfTextAtSize(orgText, 12)
  page.drawText(orgText, {
    x: (width - orgWidth) / 2,
    y: 50,
    size: 12,
    font: helvetica,
    color: textColor,
  })

  return pdfDoc.save()
}
