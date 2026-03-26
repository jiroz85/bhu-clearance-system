import { Controller, Get, Query, Param, Res } from '@nestjs/common';
import { Response } from 'express';
import { PrismaService } from '../prisma/prisma.service';

@Controller('verify')
export class VerificationController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  publicVerificationPage(@Res() res: Response) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>BHU Clearance Certificate Verification - Bule Hora University</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        
        .container {
            background: white;
            border-radius: 12px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 600px;
            width: 100%;
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 24px;
            margin-bottom: 8px;
            font-weight: 600;
        }
        
        .header p {
            opacity: 0.9;
            font-size: 14px;
        }
        
        .content {
            padding: 40px 30px;
        }
        
        .search-section {
            margin-bottom: 30px;
        }
        
        .search-section h2 {
            color: #1f2937;
            margin-bottom: 16px;
            font-size: 18px;
            font-weight: 600;
        }
        
        .search-form {
            display: flex;
            gap: 12px;
            margin-bottom: 20px;
        }
        
        .search-input {
            flex: 1;
            padding: 12px 16px;
            border: 2px solid #e5e7eb;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.2s;
        }
        
        .search-input:focus {
            outline: none;
            border-color: #10b981;
        }
        
        .search-button {
            background: #10b981;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        
        .search-button:hover {
            background: #059669;
        }
        
        .or-text {
            text-align: center;
            color: #6b7280;
            margin: 20px 0;
            font-size: 14px;
        }
        
        .qr-section {
            text-align: center;
            padding: 20px;
            background: #f9fafb;
            border-radius: 8px;
            margin-top: 20px;
        }
        
        .qr-placeholder {
            width: 200px;
            height: 200px;
            background: #e5e7eb;
            border: 2px dashed #9ca3af;
            border-radius: 8px;
            margin: 0 auto 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #6b7280;
            font-size: 14px;
        }
        
        .result {
            display: none;
            margin-top: 30px;
            padding: 24px;
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 8px;
        }
        
        .result.error {
            background: #fef2f2;
            border-color: #fecaca;
        }
        
        .result h3 {
            color: #065f46;
            margin-bottom: 16px;
            font-size: 18px;
        }
        
        .result.error h3 {
            color: #991b1b;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 16px;
            margin-top: 16px;
        }
        
        .info-item {
            padding: 12px;
            background: white;
            border-radius: 6px;
            border: 1px solid #d1fae5;
        }
        
        .info-label {
            font-size: 12px;
            color: #047857;
            font-weight: 500;
            margin-bottom: 4px;
        }
        
        .info-value {
            font-size: 16px;
            color: #065f46;
            font-weight: 600;
        }
        
        .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .status-valid {
            background: #10b981;
            color: white;
        }
        
        .footer {
            text-align: center;
            padding: 20px;
            background: #f9fafb;
            color: #6b7280;
            font-size: 12px;
        }
        
        .loading {
            display: none;
            text-align: center;
            padding: 20px;
            color: #6b7280;
        }
        
        .spinner {
            border: 2px solid #e5e7eb;
            border-top: 2px solid #10b981;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            animation: spin 1s linear infinite;
            margin: 0 auto 12px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        @media (max-width: 640px) {
            .container {
                margin: 10px;
            }
            
            .search-form {
                flex-direction: column;
            }
            
            .header {
                padding: 20px;
            }
            
            .content {
                padding: 30px 20px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎓 Bule Hora University</h1>
            <p>Clearance Certificate Verification Portal</p>
        </div>
        
        <div class="content">
            <div class="search-section">
                <h2>Verify Certificate</h2>
                <form class="search-form" onsubmit="searchCertificate(event)">
                    <input 
                        type="text" 
                        class="search-input" 
                        id="searchInput"
                        placeholder="Enter certificate number or student ID..."
                        required
                    >
                    <button type="submit" class="search-button">Verify</button>
                </form>
                
                <div class="or-text">OR</div>
                
                <div class="qr-section">
                    <div class="qr-placeholder">
                        📷 Scan QR Code
                    </div>
                    <p style="color: #6b7280; font-size: 14px;">
                        Use your camera to scan the QR code on the certificate
                    </p>
                </div>
            </div>
            
            <div class="loading" id="loading">
                <div class="spinner"></div>
                <p>Verifying certificate...</p>
            </div>
            
            <div class="result" id="result">
                <!-- Results will be populated here -->
            </div>
        </div>
        
        <div class="footer">
            <p>© 2024 Bule Hora University - Registrar Office</p>
            <p>This is an official verification portal for BHU clearance certificates</p>
        </div>
    </div>

    <script>
        async function searchCertificate(event) {
            event.preventDefault();
            
            const searchInput = document.getElementById('searchInput');
            const loading = document.getElementById('loading');
            const result = document.getElementById('result');
            
            const query = searchInput.value.trim();
            if (!query) return;
            
            // Show loading
            loading.style.display = 'block';
            result.style.display = 'none';
            
            try {
                const response = await fetch('/api/verify/certificate/' + encodeURIComponent(query));
                const data = await response.json();
                
                loading.style.display = 'none';
                
                if (response.ok && data.valid) {
                    showValidResult(data);
                } else {
                    showInvalidResult(data.message || 'Certificate not found or invalid');
                }
            } catch (error) {
                loading.style.display = 'none';
                showInvalidResult('Verification service temporarily unavailable');
            }
        }
        
        function showValidResult(data) {
            const result = document.getElementById('result');
            result.className = 'result';
            result.innerHTML = \`
                <h3>✅ Certificate Verified</h3>
                <p style="color: #065f46; margin-bottom: 16px;">
                    This certificate is authentic and valid.
                </p>
                
                <div class="info-grid">
                    <div class="info-item">
                        <div class="info-label">Student Name</div>
                        <div class="info-value">\${data.studentName}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Student ID</div>
                        <div class="info-value">\${data.studentId}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Department</div>
                        <div class="info-value">\${data.department}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Certificate Number</div>
                        <div class="info-value">\${data.certificateNumber}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Issue Date</div>
                        <div class="info-value">\${new Date(data.issueDate).toLocaleDateString()}</div>
                    </div>
                    <div class="info-item">
                        <div class="info-label">Status</div>
                        <div class="info-value">
                            <span class="status-badge status-valid">VALID</span>
                        </div>
                    </div>
                </div>
                
                <div style="margin-top: 20px; padding: 16px; background: white; border-radius: 6px; border: 1px solid #d1fae5;">
                    <p style="color: #047857; font-size: 14px; margin: 0;">
                        <strong>Verification ID:</strong> \${data.verificationId}<br>
                        <strong>Verified on:</strong> \${new Date().toLocaleString()}
                    </p>
                </div>
            \`;
            result.style.display = 'block';
        }
        
        function showInvalidResult(message) {
            const result = document.getElementById('result');
            result.className = 'result error';
            result.innerHTML = \`
                <h3>❌ Verification Failed</h3>
                <p style="color: #991b1b; margin-bottom: 16px;">
                    \${message}
                </p>
                <div style="padding: 16px; background: white; border-radius: 6px; border: 1px solid #fecaca;">
                    <p style="color: #991b1b; font-size: 14px; margin: 0;">
                        Please check the certificate number and try again. If the problem persists, contact the registrar office.
                    </p>
                </div>
            \`;
            result.style.display = 'block';
        }
        
        // Parse URL parameters for direct verification
        window.addEventListener('load', () => {
            const urlParams = new URLSearchParams(window.location.search);
            const certNumber = urlParams.get('cert');
            if (certNumber) {
                document.getElementById('searchInput').value = certNumber;
                searchCertificate(new Event('submit'));
            }
        });
    </script>
</body>
</html>
    `;

    res.set({
      'Content-Type': 'text/html',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
    });

    res.send(html);
  }

  @Get('certificate/:query')
  async verifyCertificate(@Param('query') query: string) {
    try {
      // Try to find by certificate number first
      let clearance = await this.prisma.clearance.findFirst({
        where: {
          status: 'FULLY_CLEARED',
          OR: [
            { referenceId: { contains: query, mode: 'insensitive' } },
            {
              student: {
                studentUniversityId: { contains: query, mode: 'insensitive' },
              },
            },
          ],
        },
        include: {
          student: {
            select: {
              displayName: true,
              studentUniversityId: true,
              studentDepartment: true,
              studentYear: true,
            },
          },
        },
      });

      if (!clearance) {
        return {
          valid: false,
          message: 'Certificate not found or invalid',
        };
      }

      return {
        valid: true,
        certificateNumber: clearance.referenceId,
        studentName: clearance.student.displayName,
        studentId: clearance.student.studentUniversityId,
        department: clearance.student.studentDepartment,
        issueDate: clearance.updatedAt, // When it was fully cleared
        verificationId: `VERIFIED-${Date.now()}`,
      };
    } catch (error) {
      return {
        valid: false,
        message: 'Verification service temporarily unavailable',
      };
    }
  }
}
