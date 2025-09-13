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

  // Format currency with proper Indian formatting but using INR instead of ₹
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

  // Common header for all PDF pages
  private addHeader(doc: any, title: string) {
    // Clinic information
    doc
      .fillColor('#333333')
      .fontSize(16)
      .text(this.clinicInfo.name, 50, 50, { align: 'center' })
      .fontSize(10)
      .text(this.clinicInfo.address, 50, 70, { align: 'center' })
      .text(`Phone: ${this.clinicInfo.phone} | Email: ${this.clinicInfo.email}`, 50, 85, { align: 'center' });
    
    // Report title
    doc
      .fontSize(14)
      .text(title, 50, 110, { align: 'center' })
      .moveDown();
    
    // Horizontal line
    doc
      .moveTo(50, 130)
      .lineTo(550, 130)
      .strokeColor('#cccccc')
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

  // Draw table with proper formatting
  private drawTable(doc: any, headers: string[], rows: any[], columnPositions: number[], startY: number, currentHeaderTitle: string): number {
    // Table header
    doc.font('Helvetica-Bold').fontSize(10);
    headers.forEach((header, i) => {
      doc.text(header, columnPositions[i], startY);
    });
    
    // Table rows
    doc.font('Helvetica').fontSize(9);
    let y = startY + 20;
    
    rows.forEach((row, rowIndex) => {
      // Check if we need a new page
      if (y > 700) {
        doc.addPage();
        this.addHeader(doc, `${currentHeaderTitle} (Continued)`);
        y = 150;
        
        // Add table header again on new page
        doc.font('Helvetica-Bold').fontSize(10);
        headers.forEach((header, i) => {
          doc.text(header, columnPositions[i], y);
        });
        y += 20;
        doc.font('Helvetica').fontSize(9);
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
        
        // Patient Statistics
        doc.fontSize(12).text('Patient Statistics', 50, 150);
        
        let yPosition = 180;
        data.patientStats.forEach((stat: any) => {
          doc.text(`${stat.status}: ${stat.count}`, 50, yPosition);
          yPosition += 20;
        });

        // Revenue Statistics
        doc.fontSize(12).text('Revenue Statistics', 50, 250);
        doc
          .text(`Total Revenue: ${this.formatCurrency(data.revenue.total)}`, 50, 280)
          .text(`Today's Revenue: ${this.formatCurrency(data.revenue.today)}`, 50, 300)
          .text(`Monthly Revenue: ${this.formatCurrency(data.revenue.monthly)}`, 50, 320)
          .text(`Today's Sessions: ${data.todaysSessions}`, 50, 340);

        this.addFooter(doc);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // 2. Doctor-wise Stats PDF
  async generateDoctorWiseReport(data: any, startDate: string, endDate: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const currentHeaderTitle = `Doctor-wise Performance Report (${startDate} to ${endDate})`;
        const buffers: any[] = [];
        
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        this.addHeader(doc, currentHeaderTitle);
        
        // Period information
        doc.fontSize(10).text(`Period: ${startDate} to ${endDate}`, 50, 150);
        
        // Prepare table data
        const headers = ['Doctor Name', 'Patients', 'Sessions', 'Revenue'];
        const rows = data.map((doctor: any) => [
          doctor.doctorName,
          doctor.patientCount.toString(),
          doctor.sessionCount.toString(),
          this.formatCurrency(parseFloat(doctor.revenue))
        ]);
        
        const columnPositions = [50, 250, 350, 450];
        this.drawTable(doc, headers, rows, columnPositions, 180, currentHeaderTitle);

        this.addFooter(doc);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // 3. Patient History PDF - Fixed version
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
        doc.fontSize(12).text('Patient Information', 50, 150);
        doc
          .text(`Name: ${patient.name}`, 50, 180)
          .text(`Age: ${patient.age}`, 50, 200)
          .text(`Mobile: ${patient.mobile}`, 50, 220)
          .text(`Status: ${patient.status}`, 50, 240)
          .text(`Assigned Doctor: ${patient.assigned_doctor?.name || 'Not assigned'}`, 50, 260)
          .text(`Total Amount: ${this.formatCurrency(parseFloat(patient.total_amount))}`, 50, 280)
          .text(`Paid Amount: ${this.formatCurrency(patient.totalPaid)}`, 50, 300)
          .text(`Remaining Amount: ${this.formatCurrency(patient.remainingAmount)}`, 50, 320);

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
          this.drawTable(doc, headers, rows, columnPositions, 150, sessionsHeaderTitle);
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
          this.drawTable(doc, headers, rows, columnPositions, 150, paymentsHeaderTitle);
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
          .text(`Period: ${startDate} to ${endDate}`, 50, 150)
          .text(`Total Revenue: ${this.formatCurrency(data.totalRevenue)}`, 50, 170);
        
        // Revenue by payment mode table
        doc.fontSize(12).text('Revenue by Payment Mode', 50, 200);
        
        const headers = ['Payment Mode', 'Amount'];
        const rows = data.revenueByPaymentMode.map((item: any) => [
          item.paymentMode,
          this.formatCurrency(parseFloat(item.total))
        ]);
        
        const columnPositions = [50, 250];
        this.drawTable(doc, headers, rows, columnPositions, 230, currentHeaderTitle);

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
          .text(`Period: ${monthNames[month-1]} ${year}`, 50, 150)
          .text(`Total Revenue: ${this.formatCurrency(data.totalRevenue)}`, 50, 170);
        
        // Daily Revenue Chart
        doc.fontSize(12).text('Daily Revenue', 50, 200);
        
        const dailyHeaders = ['Date', 'Revenue'];
        const dailyRows = data.dailyRevenue.map((item: any) => [
          item.date,
          this.formatCurrency(parseFloat(item.revenue))
        ]);
        
        const dailyColumnPositions = [50, 250];
        let yPosition = this.drawTable(doc, dailyHeaders, dailyRows, dailyColumnPositions, 230, currentHeaderTitle);

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
          .text(`Year: ${year}`, 50, 150)
          .text(`Total Revenue: ${this.formatCurrency(data.totalRevenue)}`, 50, 170);
        
        // Monthly Revenue Chart
        doc.fontSize(12).text('Monthly Revenue', 50, 200);
        
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        
        const monthlyHeaders = ['Month', 'Revenue'];
        const monthlyRows = data.monthlyRevenue.map((item: any) => [
          monthNames[parseInt(item.month) - 1],
          this.formatCurrency(parseFloat(item.revenue))
        ]);
        
        const monthlyColumnPositions = [50, 250];
        let yPosition = this.drawTable(doc, monthlyHeaders, monthlyRows, monthlyColumnPositions, 230, currentHeaderTitle);

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
        
        // Summary
        const totalPending = data.reduce((sum: number, patient: any) => sum + patient.pending_amount, 0);
        doc.fontSize(10)
          .text(`Total Patients with Pending Payments: ${data.length}`, 50, 150)
          .text(`Total Pending Amount: ${this.formatCurrency(totalPending)}`, 50, 170);
        
        // Table header
        const headers = ['Patient Name', 'Contact', 'Doctor', 'Pending Amount'];
        const rows = data.map((patient: any) => [
          patient.name,
          patient.mobile,
          patient.assigned_doctor,
          this.formatCurrency(patient.pending_amount)
        ]);
        
        const columnPositions = [50, 200, 300, 450];
        this.drawTable(doc, headers, rows, columnPositions, 200, currentHeaderTitle);

        this.addFooter(doc);
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}