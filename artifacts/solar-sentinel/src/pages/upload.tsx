import { Navbar } from "@/components/layout/Navbar";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useUploadData } from "@workspace/api-client-react";
import { Upload as UploadIcon, FileUp, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function Upload() {
  const [file, setFile] = useState<File | null>(null);
  const { mutate: uploadData, isPending } = useUploadData();
  const { toast } = useToast();
  const [result, setResult] = useState<{rows: number, events: number} | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
      setResult(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ 
    onDrop,
    accept: { 'text/csv': ['.csv'] },
    maxFiles: 1
  });

  const handleRun = () => {
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    
    uploadData({ data: formData }, {
      onSuccess: (res) => {
        toast({ title: "Pipeline Complete", description: "Data successfully processed." });
        setResult({ rows: res.rows, events: res.events_detected });
        setFile(null); // Reset
      },
      onError: () => {
        toast({ title: "Upload Failed", description: "There was an error processing the data.", variant: "destructive" });
      }
    });
  };

  return (
    <div className="min-h-screen bg-background text-foreground pt-16">
      <Navbar />
      
      <main className="max-w-[800px] mx-auto p-6 pt-12">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold">Upload & Analyze</h1>
          <p className="text-muted-foreground font-mono text-sm mt-2">Run custom datasets through the SolarSentinel detection pipeline.</p>
        </div>

        <div 
          {...getRootProps()} 
          className={`border-2 border-dashed rounded-lg p-16 text-center transition-all cursor-pointer ${
            isDragActive ? "border-primary bg-primary/5" : "border-border bg-card/50 hover:bg-card hover:border-secondary/50"
          }`}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center">
            <div className={`p-4 rounded-full mb-4 ${isDragActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
              <FileUp className="w-8 h-8" />
            </div>
            {file ? (
              <div className="space-y-2">
                <p className="font-mono text-foreground font-bold text-lg">{file.name}</p>
                <p className="font-mono text-sm text-muted-foreground">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
            ) : (
              <div>
                <p className="font-display text-lg mb-2">Drag & drop CSV data here</p>
                <p className="font-mono text-sm text-muted-foreground">or click to browse local files</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8 flex justify-end">
          <Button 
            onClick={handleRun} 
            disabled={!file || isPending}
            className="font-mono bg-secondary text-secondary-foreground hover:bg-secondary/90 h-12 px-8"
          >
            {isPending ? "Processing..." : (
              <>
                <UploadIcon className="w-4 h-4 mr-2" />
                RUN PIPELINE
              </>
            )}
          </Button>
        </div>

        {result && (
          <div className="mt-12 bg-green-900/20 border border-green-700/50 rounded p-6">
            <div className="flex items-center gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-green-500" />
              <h3 className="font-display text-xl text-green-400">Analysis Complete</h3>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-black/40 p-4 rounded border border-white/5">
                <p className="text-xs font-mono text-muted-foreground mb-1 uppercase">Rows Processed</p>
                <p className="text-2xl font-mono text-foreground">{result.rows.toLocaleString()}</p>
              </div>
              <div className="bg-black/40 p-4 rounded border border-white/5">
                <p className="text-xs font-mono text-muted-foreground mb-1 uppercase">Events Detected</p>
                <p className="text-2xl font-mono text-primary font-bold">{result.events.toLocaleString()}</p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
