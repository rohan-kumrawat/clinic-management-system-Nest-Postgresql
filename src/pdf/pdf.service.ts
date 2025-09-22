// src/pdf/pdf.service.ts
import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import { Buffer } from 'buffer';

@Injectable()
export class PdfService {
  private clinicInfo = {
    name: 'ADVANCE LASER CLINIC',
    subName: "Dr. Shashi's PHYSIOTHERAPY And Clinical Fitness",
    tagline: "For Pain Free Life......",
    services: ["PHYSIOTHERAPY", "WEIGHT LOSS CLINIC", "REHABILITATION"],
    doctorName: "Dr. Shashi Pareta",
    qualifications: "B.P.T.M.P.T. (Ortho) Consulting Physiotherapist",
    phone: "88171 44273",
    email: "shashipareta12@gmail.com",
    clinicAddress: "19-E, Tulsi Nagar Rd, near BCM Paradise, Tulsi Nagar, Nipania, Indore, Madhya Pradesh 453771",
    
  };

  // Format currency with proper Indian formatting
  private formatCurrency(amount: number): string {
    if (isNaN(amount)) return 'INR 0.00';
    
    return 'INR ' + new Intl.NumberFormat('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  }

  // Format date consistently
  private formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-IN').format(date);
  }

  // Common header for all PDF pages based on client's design
  private addHeader(doc: any, title: string) {
    // Set colors
    const primaryColor = '#2c5aa0'; // Blue color from the design
    const secondaryColor = '#d4af37'; // Gold accent color
    
    // Clinic information - Top section
    doc
      .fillColor(primaryColor)
      .fontSize(12)
      .font('Helvetica-Bold')
      .text(this.clinicInfo.name, 50, 40, { align: 'center' })
      .fontSize(18)
      .font('Helvetica')
      .text(this.clinicInfo.subName, 50, 65, { align: 'center' })
      .fontSize(10)
      .text(this.clinicInfo.tagline, 50, 80, { align: 'center' });
    
    // Three service boxes with background colors
    const boxY = 100;
    const boxWidth = 150;
    const boxHeight = 25;
    
    // First box - Blue background
    doc.rect(50, boxY, boxWidth, boxHeight).fill('#d24e01');
    doc.fillColor('#FFFFFF').fontSize(10).text(this.clinicInfo.services[0], 55, boxY + 8);
    
    // Second box - Gold background
    doc.rect(210, boxY, boxWidth, boxHeight).fill('#d24e01');
    doc.fillColor('#FFFFFF').fontSize(10).text(this.clinicInfo.services[1], 215, boxY + 8);
    
    // Third box - Light blue background
    doc.rect(370, boxY, boxWidth, boxHeight).fill('#d24e01');
    doc.fillColor('#FFFFFF').fontSize(10).text(this.clinicInfo.services[2], 375, boxY + 8);
    
    // Reset text color
    doc.fillColor('#000000');
    
    // Doctor information
    doc.fontSize(11)
      .text(this.clinicInfo.doctorName, 50, boxY + 35)
      .text(this.clinicInfo.qualifications, 50, boxY + 50)
      .text(this.clinicInfo.phone, 50, boxY + 65)
      .text(this.clinicInfo.email, 50, boxY + 80);
    
    // Horizontal line
    doc
      .moveTo(50, boxY + 100)
      .lineTo(550, boxY + 100)
      .strokeColor(primaryColor)
      .lineWidth(2)
      .stroke();
    
    // Report title
    doc
      .fontSize(16)
      .fillColor(primaryColor)
      .text(title, 50, boxY + 110, { align: 'center' })
      .fillColor('#000000');
  }

  // Common footer for all PDF pages
  private addFooter(doc: any) {
    const pageHeight = doc.page.height;
    const primaryColor = '#2c5aa0';
    
    // Horizontal line
    doc
      .moveTo(50, pageHeight - 80)
      .lineTo(550, pageHeight - 80)
      .strokeColor(primaryColor)
      .lineWidth(1)
      .stroke();
    
    // Clinic and residence addresses
    doc.fontSize(9)
      .text('Clinic Address:', 50, pageHeight - 70)
      .text(this.clinicInfo.clinicAddress, 50, pageHeight - 60)
    
    // Generation info and copyright
    doc.fontSize(8)
      .fillColor('#666666')
      .text(`Generated on: ${new Date().toLocaleString()}`, 50, pageHeight - 40, { align: 'center' })
      .text(`© ${new Date().getFullYear()} ${this.clinicInfo.name}. All rights reserved.`, 50, pageHeight - 30, { align: 'center' })
      .fillColor('#000000');
  }

  // Draw table with proper formatting and styling
  private drawTable(doc: any, headers: string[], rows: any[], columnPositions: number[], startY: number, currentHeaderTitle: string): number {
    const primaryColor = '#2c5aa0';
    
    // Table header with background color
    doc.rect(50, startY - 10, 500, 25).fill(primaryColor);
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff');
    
    headers.forEach((header, i) => {
      doc.text(header, columnPositions[i], startY);
    });
    
    // Table rows
    doc.font('Helvetica').fontSize(9).fillColor('#000000');
    let y = startY + 20;
    
    rows.forEach((row, rowIndex) => {
      // Check if we need a new page
      if (y > 700) {
        doc.addPage();
        this.addHeader(doc, `${currentHeaderTitle} (Continued)`);
        y = 180;
        
        // Add table header again on new page
        doc.rect(50, y - 10, 500, 25).fill(primaryColor);
        doc.font('Helvetica-Bold').fontSize(10).fillColor('#ffffff');
        headers.forEach((header, i) => {
          doc.text(header, columnPositions[i], y);
        });
        y += 20;
        doc.font('Helvetica').fontSize(9).fillColor('#000000');
      }
      
      // Alternate row background
      if (rowIndex % 2 === 0) {
        doc.rect(50, y - 5, 500, 20).fill('#f5f5f5').fillColor('#000000');
      }
      
      row.forEach((cell: string, cellIndex: number) => {
        doc.text(cell, columnPositions[cellIndex], y);
      });
      
      y += 20;
    });
    
    return y;
  }

  // 1. Dashboard Report PDF
  async generateDashboardReport(data: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const currentHeaderTitle = 'Dashboard Report';
        const buffers: any[] = [];
        
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        this.addHeader(doc, currentHeaderTitle);
        
        // Start content below the header
        const startY = 230;
        
        // Patient Statistics
        doc.fontSize(12).text('Patient Statistics', 50, startY);
        
        let yPosition = startY + 30;
        data.patientStats.forEach((stat: any) => {
          doc.text(`${stat.status}: ${stat.count}`, 50, yPosition);
          yPosition += 20;
        });

        // Revenue Statistics
        doc.fontSize(12).text('Revenue Statistics', 50, yPosition + 10);
        doc
          .text(`Total Revenue: ${this.formatCurrency(data.revenue.total)}`, 50, yPosition + 40)
          .text(`Today's Revenue: ${this.formatCurrency(data.revenue.today)}`, 50, yPosition + 60)
          .text(`Monthly Revenue: ${this.formatCurrency(data.revenue.monthly)}`, 50, yPosition + 80)
          .text(`Today's Sessions: ${data.todaysSessions}`, 50, yPosition + 100);

        this.addFooter(doc);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // 2. Doctor-wise Stats PDF
  async generateDoctorWiseReport(data: any[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const buffers: any[] = [];

      doc.on('data', buffers.push.bind(buffers));
      doc.on('end', () => {
        const pdfData = Buffer.concat(buffers);
        resolve(pdfData);
      });

      // ✅ Title without date range
      doc.fontSize(20).font('Helvetica-Bold')
         .fillColor('#2c3e50')
         .text('DOCTOR PERFORMANCE REPORT', 50, 50, { align: 'center' });
      
      doc.fontSize(12).font('Helvetica')
         .fillColor('#7f8c8d')
         .text('All Time Statistics', 50, 80, { align: 'center' });

      // Clinic Info
      doc.fontSize(10)
         .fillColor('#34495e')
         .text('ADVANCE LASER CLINIC', 50, 110)
         .text('Contact: +91-XXXXXXXXXX | Email: clinic@advancelaser.com', 50, 125);

      // Summary Stats
      const totalSessions = data.reduce((sum, doc) => sum + doc.sessionCount, 0);
      const totalRevenue = data.reduce((sum, doc) => sum + doc.revenue, 0);
      const totalPatients = data.reduce((sum, doc) => sum + doc.patientCount, 0);

      doc.fontSize(12).font('Helvetica-Bold')
         .fillColor('#2c3e50')
         .text('SUMMARY', 50, 160);
      
      doc.fontSize(10).font('Helvetica')
         .fillColor('#34495e')
         .text(`Total Doctors: ${data.length}`, 50, 180)
         .text(`Total Sessions: ${totalSessions}`, 50, 195)
         .text(`Total Patients: ${totalPatients}`, 50, 210)
         .text(`Total Revenue: ₹${totalRevenue.toLocaleString('en-IN')}`, 50, 225);

      // Doctor-wise Table Header
      let yPosition = 260;
      
      // Table Header
      doc.fontSize(10).font('Helvetica-Bold')
         .fillColor('#ffffff')
         .rect(50, yPosition, 500, 25).fill('#2c3e50');
      
      doc.text('Doctor Name', 60, yPosition + 8)
        .text('Patients', 250, yPosition + 8)
        .text('Sessions', 320, yPosition + 8)
        .text('Revenue', 390, yPosition + 8, { width: 150, align: 'right' });

      yPosition += 30;

      // Doctor Data Rows
      data.forEach((doctor, index) => {
        if (yPosition > 700) {
          doc.addPage();
          yPosition = 50;
        }

        // Alternate row colors
        const bgColor = index % 2 === 0 ? '#f8f9fa' : '#ffffff';
        doc.rect(50, yPosition, 500, 20).fill(bgColor);
        
        doc.fontSize(9).font('Helvetica')
           .fillColor('#2c3e50')
           .text(doctor.doctorName, 60, yPosition + 5, { width: 180 })
           .text(doctor.patientCount.toString(), 250, yPosition + 5, { width: 60 })
           .text(doctor.sessionCount.toString(), 320, yPosition + 5, { width: 60 })
           .text(`₹${doctor.revenue.toLocaleString('en-IN')}`, 390, yPosition + 5, { width: 150, align: 'right' });

        yPosition += 25;
      });

      // Footer
      const totalPages = doc.bufferedPageRange().count;
      for (let i = 0; i < totalPages; i++) {
        doc.switchToPage(i);
        
        doc.fontSize(8).font('Helvetica')
           .fillColor('#7f8c8d')
           .text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 50, 800, { align: 'left' })
           .text(`Page ${i + 1} of ${totalPages}`, 50, 800, { align: 'right' });
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
}

  // 3. Patient History PDF
  async generatePatientHistoryReport(data: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers: any[] = [];
        
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        const { patient, sessions, payments } = data;
        const patientHeaderTitle = `Patient History - ${patient.name}`;
        
        this.addHeader(doc, patientHeaderTitle);
        
        // Patient Information
        const startY = 230;
        doc.fontSize(12).text('Patient Information', 50, startY);
        doc
          .text(`Name: ${patient.name}`, 50, startY + 30)
          .text(`Age: ${patient.age}`, 50, startY + 50)
          .text(`Mobile: ${patient.mobile}`, 50, startY + 70)
          .text(`Status: ${patient.status}`, 50, startY + 90)
          .text(`Assigned Doctor: ${patient.assigned_doctor?.name || 'Not assigned'}`, 50, startY + 110)
          .text(`Total Amount: ${this.formatCurrency(parseFloat(patient.total_amount))}`, 50, startY + 130)
          .text(`Paid Amount: ${this.formatCurrency(patient.totalPaid)}`, 50, startY + 150)
          .text(`Remaining Amount: ${this.formatCurrency(patient.remainingAmount)}`, 50, startY + 170);

        // Sessions Information
        if (sessions && sessions.length > 0) {
          doc.addPage();
          const sessionsHeaderTitle = `Patient Sessions - ${patient.name}`;
          this.addHeader(doc, sessionsHeaderTitle);
          
          const headers = ['Date', 'Doctor', 'Visit Type', 'Remarks'];
          const rows = sessions.map((session: any) => [
            this.formatDate(new Date(session.session_date)),
            session.doctor.name,
            session.visit_type || 'N/A',
            (session.remarks || 'No remarks').substring(0, 30) + (session.remarks?.length > 30 ? '...' : '')
          ]);
          
          const columnPositions = [50, 120, 250, 350];
          this.drawTable(doc, headers, rows, columnPositions, 180, sessionsHeaderTitle);
        }

        // Payments Information
        if (payments && payments.length > 0) {
          doc.addPage();
          const paymentsHeaderTitle = `Payment History - ${patient.name}`;
          this.addHeader(doc, paymentsHeaderTitle);
          
          const headers = ['Date', 'Amount Paid', 'Payment Mode', 'Remaining'];
          const rows = payments.map((payment: any) => [
            this.formatDate(new Date(payment.payment_date)),
            this.formatCurrency(payment.amount_paid),
            payment.payment_mode,
            this.formatCurrency(payment.remaining_amount)
          ]);
          
          const columnPositions = [50, 150, 250, 350];
          this.drawTable(doc, headers, rows, columnPositions, 180, paymentsHeaderTitle);
        }

        this.addFooter(doc);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // 4. Financial Summary PDF
  async generateFinancialReport(data: any, startDate: string, endDate: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const currentHeaderTitle = `Financial Summary Report (${startDate} to ${endDate})`;
        const buffers: any[] = [];
        
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        this.addHeader(doc, currentHeaderTitle);
        
        // Period information
        doc.fontSize(10)
          .text(`Period: ${startDate} to ${endDate}`, 50, 230)
          .text(`Total Revenue: ${this.formatCurrency(data.totalRevenue)}`, 50, 250);
        
        // Revenue by payment mode table
        doc.fontSize(12).text('Revenue by Payment Mode', 50, 280);
        
        const headers = ['Payment Mode', 'Amount'];
        const rows = data.revenueByPaymentMode.map((item: any) => [
          item.paymentMode,
          this.formatCurrency(parseFloat(item.total))
        ]);
        
        const columnPositions = [50, 250];
        this.drawTable(doc, headers, rows, columnPositions, 300, currentHeaderTitle);

        this.addFooter(doc);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // 5. Monthly Financial Report PDF
  async generateMonthlyFinancialReport(data: any, year: number, month: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                           'July', 'August', 'September', 'October', 'November', 'December'];
        const currentHeaderTitle = `Monthly Financial Report - ${monthNames[month-1]} ${year}`;
        const buffers: any[] = [];
        
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        this.addHeader(doc, currentHeaderTitle);
        
        // Period information
        doc.fontSize(10)
          .text(`Period: ${monthNames[month-1]} ${year}`, 50, 230)
          .text(`Total Revenue: ${this.formatCurrency(data.totalRevenue)}`, 50, 250);
        
        // Daily Revenue Chart
        doc.fontSize(12).text('Daily Revenue', 50, 280);
        
        const dailyHeaders = ['Date', 'Revenue'];
        const dailyRows = data.dailyRevenue.map((item: any) => [
          item.date,
          this.formatCurrency(parseFloat(item.revenue))
        ]);
        
        const dailyColumnPositions = [50, 250];
        let yPosition = this.drawTable(doc, dailyHeaders, dailyRows, dailyColumnPositions, 300, currentHeaderTitle);

        // Revenue by payment mode
        doc.fontSize(12).text('Revenue by Payment Mode', 50, yPosition + 20);
        
        const paymentHeaders = ['Payment Mode', 'Amount'];
        const paymentRows = data.revenueByPaymentMode.map((item: any) => [
          item.paymentMode,
          this.formatCurrency(parseFloat(item.total))
        ]);
        
        this.drawTable(doc, paymentHeaders, paymentRows, dailyColumnPositions, yPosition + 50, currentHeaderTitle);

        this.addFooter(doc);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // 6. Yearly Financial Report PDF
  async generateYearlyFinancialReport(data: any, year: number): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const currentHeaderTitle = `Yearly Financial Report - ${year}`;
        const buffers: any[] = [];
        
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        this.addHeader(doc, currentHeaderTitle);
        
        // Period information
        doc.fontSize(10)
          .text(`Year: ${year}`, 50, 230)
          .text(`Total Revenue: ${this.formatCurrency(data.totalRevenue)}`, 50, 250);
        
        // Monthly Revenue Chart
        doc.fontSize(12).text('Monthly Revenue', 50, 280);
        
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        const monthlyHeaders = ['Month', 'Revenue'];
        const monthlyRows = data.monthlyRevenue.map((item: any) => [
          monthNames[parseInt(item.month) - 1],
          this.formatCurrency(parseFloat(item.revenue))
        ]);
        
        const monthlyColumnPositions = [50, 250];
        let yPosition = this.drawTable(doc, monthlyHeaders, monthlyRows, monthlyColumnPositions, 300, currentHeaderTitle);

        // Revenue by payment mode
        doc.fontSize(12).text('Revenue by Payment Mode', 50, yPosition + 20);
        
        const paymentHeaders = ['Payment Mode', 'Amount'];
        const paymentRows = data.revenueByPaymentMode.map((item: any) => [
          item.paymentMode,
          this.formatCurrency(parseFloat(item.total))
        ]);
        
        this.drawTable(doc, paymentHeaders, paymentRows, monthlyColumnPositions, yPosition + 50, currentHeaderTitle);

        this.addFooter(doc);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // 7. Pending Payments PDF
  async generatePendingPaymentsReport(data: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const currentHeaderTitle = 'Pending Payments Report';
        const buffers: any[] = [];
        
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        this.addHeader(doc, currentHeaderTitle);
        
        // Summary with better styling
        const totalPending = data.reduce((sum: number, patient: any) => sum + patient.pending_amount, 0);
        
        doc.fontSize(12)
          .text(`Total Patients with Pending Payments: `, 50, 230)
          .fillColor('#2c5aa0')
          .text(`${data.length}`, 250, 230)
          .fillColor('#000000')
          .text(`Total Pending Amount: `, 50, 250)
          .fillColor('#d9534f') // Red color for amount
          .text(`${this.formatCurrency(totalPending)}`, 250, 250)
          .fillColor('#000000');
        
        // Table header
        const headers = ['Patient Name', 'Contact', 'Doctor', 'Pending Amount'];
        const rows = data.map((patient: any) => [
          patient.name,
          patient.mobile,
          patient.assigned_doctor,
          this.formatCurrency(patient.pending_amount)
        ]);
        
        const columnPositions = [50, 200, 300, 450];
        this.drawTable(doc, headers, rows, columnPositions, 280, currentHeaderTitle);

        this.addFooter(doc);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}