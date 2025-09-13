// src/pdf/pdf.service.ts
import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { Buffer } from 'buffer';

@Injectable()
export class PdfService {
  private clinicInfo = {
    name: 'Your Clinic Name',
    address: '123 Clinic Street, City, State - PINCODE',
    phone: '+91-9876543210',
    email: 'info@yourclinic.com'
  };

  // Common header for all PDF pages
  private addHeader(doc: any, title: string) {
    // Clinic information
    doc
      .fillColor('#444444')
      .fontSize(20)
      .text(this.clinicInfo.name, 50, 50, { align: 'center' })
      .fontSize(10)
      .text(this.clinicInfo.address, 50, 70, { align: 'center' })
      .text(`Phone: ${this.clinicInfo.phone} | Email: ${this.clinicInfo.email}`, 50, 85, { align: 'center' });
    
    // Report title
    doc
      .fontSize(16)
      .text(title, 50, 110, { align: 'center' })
      .moveDown();
    
    // Horizontal line
    doc
      .moveTo(50, 130)
      .lineTo(550, 130)
      .stroke();
  }

  // Common footer for all PDF pages
  private addFooter(doc: any) {
    const pageHeight = doc.page.height;
    doc
      .fontSize(8)
      .text(`Generated on: ${new Date().toLocaleString()}`, 50, pageHeight - 50, { align: 'center' })
      .text('© 2024 Your Clinic Name. All rights reserved.', 50, pageHeight - 30, { align: 'center' });
  }

  // 1. Dashboard Report PDF
  async generateDashboardReport(data: any): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: any[] = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      this.addHeader(doc, 'Dashboard Report');
      
      // Patient Statistics
      doc.fontSize(14).text('Patient Statistics', 50, 150);
      data.patientStats.forEach((stat: any, index: number) => {
        doc.fontSize(12).text(`${stat.status}: ${stat.count}`, 50, 180 + (index * 20));
      });

      // Revenue Statistics
      doc.fontSize(14).text('Revenue Statistics', 50, 250);
      doc.fontSize(12)
        .text(`Total Revenue: ₹${data.revenue.total}`, 50, 280)
        .text(`Today's Revenue: ₹${data.revenue.today}`, 50, 300)
        .text(`Monthly Revenue: ₹${data.revenue.monthly}`, 50, 320)
        .text(`Today's Sessions: ${data.todaysSessions}`, 50, 340);

      this.addFooter(doc);
      doc.end();
    });
  }

  // 2. Doctor-wise Stats PDF
  async generateDoctorWiseReport(data: any, startDate: string, endDate: string): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: any[] = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      this.addHeader(doc, `Doctor-wise Performance Report (${startDate} to ${endDate})`);
      
      // Period information
      doc.fontSize(12)
        .text(`Period: ${startDate} to ${endDate}`, 50, 150);
      
      // Doctor performance table
      doc.fontSize(14).text('Doctor Performance', 50, 180);
      
      let yPosition = 210;
      // Table header
      doc.fontSize(12).font('Helvetica-Bold')
        .text('Doctor Name', 50, yPosition)
        .text('Patients', 200, yPosition)
        .text('Sessions', 300, yPosition)
        .text('Revenue', 400, yPosition);
      
      yPosition += 20;
      doc.font('Helvetica');
      
      // Table rows
      data.forEach((doctor: any, index: number) => {
        // Check if we need a new page
        if (yPosition > 700) {
          doc.addPage();
          this.addHeader(doc, `Doctor-wise Performance Report (Continued)`);
          yPosition = 150;
          
          // Add table header again on new page
          doc.fontSize(12).font('Helvetica-Bold')
            .text('Doctor Name', 50, yPosition)
            .text('Patients', 200, yPosition)
            .text('Sessions', 300, yPosition)
            .text('Revenue', 400, yPosition);
          yPosition = 180;
        }
        
        doc.text(doctor.doctorName, 50, yPosition)
          .text(doctor.patientCount, 200, yPosition)
          .text(doctor.sessionCount, 300, yPosition)
          .text(`₹${doctor.revenue}`, 400, yPosition);
        
        yPosition += 20;
      });

      this.addFooter(doc);
      doc.end();
    });
  }

  // 3. Patient History PDF
  async generatePatientHistoryReport(data: any): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: any[] = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      const { patient, sessions, payments } = data;
      
      this.addHeader(doc, `Patient History - ${patient.name}`);
      
      // Patient Information
      doc.fontSize(14).text('Patient Information', 50, 150);
      doc.fontSize(12)
        .text(`Name: ${patient.name}`, 50, 180)
        .text(`Age: ${patient.age}`, 50, 200)
        .text(`Mobile: ${patient.mobile}`, 50, 220)
        .text(`Status: ${patient.status}`, 50, 240)
        .text(`Assigned Doctor: ${patient.assigned_doctor ? patient.assigned_doctor.name : 'Not assigned'}`, 50, 260)
        .text(`Total Amount: ₹${patient.total_amount}`, 50, 280)
        .text(`Paid Amount: ₹${patient.totalPaid}`, 50, 300)
        .text(`Remaining Amount: ₹${patient.remainingAmount}`, 50, 320);

      // Sessions Information
      if (sessions && sessions.length > 0) {
        doc.addPage();
        this.addHeader(doc, `Patient Sessions - ${patient.name}`);
        
        doc.fontSize(14).text('Treatment Sessions', 50, 150);
        
        let yPosition = 180;
        // Table header
        doc.fontSize(12).font('Helvetica-Bold')
          .text('Date', 50, yPosition)
          .text('Doctor', 150, yPosition)
          .text('Visit Type', 300, yPosition)
          .text('Remarks', 400, yPosition);
        
        yPosition += 20;
        doc.font('Helvetica');
        
        // Table rows
        sessions.forEach((session: any) => {
          if (yPosition > 700) {
            doc.addPage();
            this.addHeader(doc, `Patient Sessions - ${patient.name} (Continued)`);
            yPosition = 150;
            
            // Add table header again on new page
            doc.fontSize(12).font('Helvetica-Bold')
              .text('Date', 50, yPosition)
              .text('Doctor', 150, yPosition)
              .text('Visit Type', 300, yPosition)
              .text('Remarks', 400, yPosition);
            yPosition = 180;
          }
          
          doc.text(new Date(session.session_date).toLocaleDateString(), 50, yPosition)
            .text(session.doctor.name, 150, yPosition)
            .text(session.visit_type || 'N/A', 300, yPosition)
            .text(session.remarks || 'No remarks', 400, yPosition, { width: 150, ellipsis: true });
          
          yPosition += 20;
        });
      }

      // Payments Information
      if (payments && payments.length > 0) {
        doc.addPage();
        this.addHeader(doc, `Payment History - ${patient.name}`);
        
        doc.fontSize(14).text('Payment History', 50, 150);
        
        let yPosition = 180;
        // Table header
        doc.fontSize(12).font('Helvetica-Bold')
          .text('Date', 50, yPosition)
          .text('Amount Paid', 150, yPosition)
          .text('Payment Mode', 250, yPosition)
          .text('Remaining', 350, yPosition);
        
        yPosition += 20;
        doc.font('Helvetica');
        
        // Table rows
        payments.forEach((payment: any) => {
          if (yPosition > 700) {
            doc.addPage();
            this.addHeader(doc, `Payment History - ${patient.name} (Continued)`);
            yPosition = 150;
            
            // Add table header again on new page
            doc.fontSize(12).font('Helvetica-Bold')
              .text('Date', 50, yPosition)
              .text('Amount Paid', 150, yPosition)
              .text('Payment Mode', 250, yPosition)
              .text('Remaining', 350, yPosition);
            yPosition = 180;
          }
          
          doc.text(new Date(payment.payment_date).toLocaleDateString(), 50, yPosition)
            .text(`₹${payment.amount_paid}`, 150, yPosition)
            .text(payment.payment_mode, 250, yPosition)
            .text(`₹${payment.remaining_amount}`, 350, yPosition);
          
          yPosition += 20;
        });
      }

      this.addFooter(doc);
      doc.end();
    });
  }

  // 4. Financial Summary PDF
  async generateFinancialReport(data: any, startDate: string, endDate: string): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: any[] = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      this.addHeader(doc, `Financial Summary Report (${startDate} to ${endDate})`);
      
      // Period information
      doc.fontSize(12)
        .text(`Period: ${startDate} to ${endDate}`, 50, 150)
        .text(`Total Revenue: ₹${data.totalRevenue}`, 50, 170);
      
      // Revenue by payment mode table
      doc.fontSize(14).text('Revenue by Payment Mode', 50, 200);
      
      let yPosition = 230;
      // Table header
      doc.fontSize(12).font('Helvetica-Bold')
        .text('Payment Mode', 50, yPosition)
        .text('Amount', 250, yPosition);
      
      yPosition += 20;
      doc.font('Helvetica');
      
      // Table rows
      data.revenueByPaymentMode.forEach((item: any) => {
        doc.text(item.paymentMode, 50, yPosition)
          .text(`₹${item.total}`, 250, yPosition);
        yPosition += 20;
      });

      this.addFooter(doc);
      doc.end();
    });
  }

  // 5. Monthly Financial Report PDF
  async generateMonthlyFinancialReport(data: any, year: number, month: number): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: any[] = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                         'July', 'August', 'September', 'October', 'November', 'December'];
      
      this.addHeader(doc, `Monthly Financial Report - ${monthNames[month-1]} ${year}`);
      
      // Period information
      doc.fontSize(12)
        .text(`Period: ${monthNames[month-1]} ${year}`, 50, 150)
        .text(`Total Revenue: ₹${data.totalRevenue}`, 50, 170);
      
      // Daily Revenue Chart
      doc.fontSize(14).text('Daily Revenue', 50, 200);
      
      let yPosition = 230;
      // Table header
      doc.fontSize(12).font('Helvetica-Bold')
        .text('Date', 50, yPosition)
        .text('Revenue', 250, yPosition);
      
      yPosition += 20;
      doc.font('Helvetica');
      
      // Table rows
      data.dailyRevenue.forEach((item: any) => {
        doc.text(item.date, 50, yPosition)
          .text(`₹${item.revenue}`, 250, yPosition);
        yPosition += 20;
      });

      // Revenue by payment mode
      doc.fontSize(14).text('Revenue by Payment Mode', 50, yPosition + 20);
      yPosition += 40;
      
      // Table header
      doc.fontSize(12).font('Helvetica-Bold')
        .text('Payment Mode', 50, yPosition)
        .text('Amount', 250, yPosition);
      
      yPosition += 20;
      doc.font('Helvetica');
      
      // Table rows
      data.revenueByPaymentMode.forEach((item: any) => {
        doc.text(item.paymentMode, 50, yPosition)
          .text(`₹${item.total}`, 250, yPosition);
        yPosition += 20;
      });

      this.addFooter(doc);
      doc.end();
    });
  }

  // 6. Yearly Financial Report PDF
  async generateYearlyFinancialReport(data: any, year: number): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: any[] = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      this.addHeader(doc, `Yearly Financial Report - ${year}`);
      
      // Period information
      doc.fontSize(12)
        .text(`Year: ${year}`, 50, 150)
        .text(`Total Revenue: ₹${data.totalRevenue}`, 50, 170);
      
      // Monthly Revenue Chart
      doc.fontSize(14).text('Monthly Revenue', 50, 200);
      
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                         'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      let yPosition = 230;
      // Table header
      doc.fontSize(12).font('Helvetica-Bold')
        .text('Month', 50, yPosition)
        .text('Revenue', 250, yPosition);
      
      yPosition += 20;
      doc.font('Helvetica');
      
      // Table rows
      data.monthlyRevenue.forEach((item: any) => {
        doc.text(monthNames[parseInt(item.month) - 1], 50, yPosition)
          .text(`₹${item.revenue}`, 250, yPosition);
        yPosition += 20;
      });

      // Revenue by payment mode
      doc.fontSize(14).text('Revenue by Payment Mode', 50, yPosition + 20);
      yPosition += 40;
      
      // Table header
      doc.fontSize(12).font('Helvetica-Bold')
        .text('Payment Mode', 50, yPosition)
        .text('Amount', 250, yPosition);
      
      yPosition += 20;
      doc.font('Helvetica');
      
      // Table rows
      data.revenueByPaymentMode.forEach((item: any) => {
        doc.text(item.paymentMode, 50, yPosition)
          .text(`₹${item.total}`, 250, yPosition);
        yPosition += 20;
      });

      this.addFooter(doc);
      doc.end();
    });
  }

  // 7. Pending Payments PDF
  async generatePendingPaymentsReport(data: any): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: any[] = [];
      
      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      this.addHeader(doc, 'Pending Payments Report');
      
      // Summary
      doc.fontSize(12)
        .text(`Total Patients with Pending Payments: ${data.length}`, 50, 150)
        .text(`Total Pending Amount: ₹${data.reduce((sum: number, patient: any) => sum + patient.pending_amount, 0)}`, 50, 170);
      
      // Table header
      doc.fontSize(12).font('Helvetica-Bold')
        .text('Patient Name', 50, 200)
        .text('Contact', 200, 200)
        .text('Doctor', 300, 200)
        .text('Pending Amount', 450, 200);
      
      let yPosition = 230;
      doc.font('Helvetica');
      
      // Table rows
      data.forEach((patient: any) => {
        // Check if we need a new page
        if (yPosition > 700) {
          doc.addPage();
          this.addHeader(doc, 'Pending Payments Report (Continued)');
          yPosition = 150;
          
          // Add table header again on new page
          doc.fontSize(12).font('Helvetica-Bold')
            .text('Patient Name', 50, yPosition)
            .text('Contact', 200, yPosition)
            .text('Doctor', 300, yPosition)
            .text('Pending Amount', 450, yPosition);
          yPosition = 180;
        }
        
        doc.text(patient.name, 50, yPosition)
          .text(patient.mobile, 200, yPosition)
          .text(patient.assigned_doctor, 300, yPosition)
          .text(`₹${patient.pending_amount}`, 450, yPosition);
        
        yPosition += 20;
      });

      this.addFooter(doc);
      doc.end();
    });
  }
}