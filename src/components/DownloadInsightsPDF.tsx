import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface DownloadInsightsPDFProps {
  sectionIds: string[];
}

const DownloadInsightsPDF = ({ sectionIds }: DownloadInsightsPDFProps) => {
  const { toast } = useToast();
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 24;
      const contentWidth = pageWidth - margin * 2;

      // Cover page
      pdf.setFillColor(15, 23, 42);
      pdf.rect(0, 0, pageWidth, pageHeight, "F");
      pdf.setTextColor(255, 255, 255);
      pdf.setFont("helvetica", "bold");
      pdf.setFontSize(28);
      pdf.text("Career Results Insights", pageWidth / 2, pageHeight / 2 - 20, { align: "center" });
      pdf.setFont("helvetica", "normal");
      pdf.setFontSize(12);
      pdf.text("Path4U — AI-powered career assessment", pageWidth / 2, pageHeight / 2 + 10, { align: "center" });
      pdf.setFontSize(10);
      pdf.text(new Date().toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }), pageWidth / 2, pageHeight / 2 + 30, { align: "center" });

      let first = true;
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (!el) continue;

        // Wait a frame in case charts are still animating
        await new Promise(r => requestAnimationFrame(() => r(null)));

        const canvas = await html2canvas(el, {
          scale: 2,
          backgroundColor: "#ffffff",
          useCORS: true,
          logging: false,
        });

        const imgData = canvas.toDataURL("image/png");
        const imgWidth = contentWidth;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        pdf.addPage();
        if (imgHeight <= pageHeight - margin * 2) {
          pdf.addImage(imgData, "PNG", margin, margin, imgWidth, imgHeight);
        } else {
          // Slice the tall image across pages
          const pxPerPt = canvas.width / imgWidth;
          const pageContentHeightPx = (pageHeight - margin * 2) * pxPerPt;
          let renderedPx = 0;
          let firstSlice = true;
          while (renderedPx < canvas.height) {
            const sliceHeightPx = Math.min(pageContentHeightPx, canvas.height - renderedPx);
            const sliceCanvas = document.createElement("canvas");
            sliceCanvas.width = canvas.width;
            sliceCanvas.height = sliceHeightPx;
            const ctx = sliceCanvas.getContext("2d");
            if (!ctx) break;
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
            ctx.drawImage(canvas, 0, -renderedPx);
            const sliceData = sliceCanvas.toDataURL("image/png");
            if (!firstSlice) pdf.addPage();
            pdf.addImage(sliceData, "PNG", margin, margin, imgWidth, (sliceHeightPx / pxPerPt));
            renderedPx += sliceHeightPx;
            firstSlice = false;
          }
        }
        first = false;
      }

      pdf.save(`Path4U-Career-Insights-${new Date().toISOString().slice(0, 10)}.pdf`);

      toast({
        title: "PDF downloaded",
        description: "Your career results insights have been saved.",
      });
    } catch (err) {
      console.error("PDF generation error:", err);
      toast({
        title: "Download failed",
        description: "Couldn't generate PDF. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10 border border-primary/20 rounded-none p-6 flex items-center justify-between flex-wrap gap-4">
      <div>
        <h4 className="font-semibold text-foreground flex items-center gap-2">
          <Download className="w-5 h-5 text-primary" />
          Download Career Results Insights
        </h4>
        <p className="text-sm text-muted-foreground mt-1">
          Export your Overall Score, Skill Fingerprint, Skill Evaluation, Job Role Probability, Salary Insights & Best Time to Switch as a PDF.
        </p>
      </div>
      <Button variant="hero" className="rounded-none" onClick={handleDownload} disabled={isDownloading}>
        {isDownloading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Preparing PDF…
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            Download PDF
          </>
        )}
      </Button>
    </div>
  );
};

export default DownloadInsightsPDF;
