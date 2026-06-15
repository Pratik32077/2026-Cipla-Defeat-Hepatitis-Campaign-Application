import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateDoctor } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Loader2, Upload, ImageIcon, X, Video, Play, AlertCircle,
  CheckCircle2, Film, RefreshCw, Download, Lock
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

const formSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  specialization: z.string().min(2, "Specialization is required"),
  city: z.string().min(2, "City is required"),
  contactNumber: z.string().min(10, "Valid contact number required"),
  language: z.string().min(1, "Language is required"),
  imageUrl: z.string().optional(),
});

const LANGUAGES = [
  "Hindi", "English", "Marathi", "Gujarati", "Telugu",
  "Tamil", "Punjabi", "Oriya", "Malayalam", "Kannada", "Bengali", "Assamese"
];

type VideoState =
  | { phase: "idle" }
  | { phase: "generating"; progress: number; step: string }
  | { phase: "done"; videoUrl: string; processingTime: string }
  | { phase: "error"; message: string };

const GENERATION_STEPS = [
  "Uploading doctor photo…",
  "Loading master template…",
  "Compositing overlays…",
  "Encoding video…",
  "Finalising output…",
];

function getToken(): string | null {
  return localStorage.getItem("cipla_token");
}

export default function ManagerAddDoctor() {
  const [, setLocation] = useLocation();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [videoState, setVideoState] = useState<VideoState>({ phase: "idle" });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const videoGenerated = videoState.phase === "done";

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", specialization: "", city: "", contactNumber: "", language: "", imageUrl: "" },
  });

  const createDoctor = useCreateDoctor({
    mutation: {
      onSuccess: () => {
        toast.success("Doctor submitted successfully!");
        setLocation("/manager/doctors");
      },
      onError: (err: any) => {
        const msg = err?.data?.error || "Failed to add doctor. Contact number may already exist.";
        toast.error(msg);
      },
    },
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Image must be under 5MB"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setImagePreview(result);
      setImageBase64(result);
      setVideoState({ phase: "idle" });
    };
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setImagePreview(null);
    setImageBase64(null);
    setVideoState({ phase: "idle" });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleGenerateVideo() {
    const values = form.getValues();
    if (!imageBase64) { toast.error("Please upload a doctor photo first."); return; }
    if (!values.name || !values.specialization || !values.language) {
      toast.error("Please fill in Name, Specialization, and Language first.");
      return;
    }

    setVideoState({ phase: "generating", progress: 0, step: GENERATION_STEPS[0] });

    let progress = 0;
    progressTimerRef.current = setInterval(() => {
      progress = Math.min(progress + 1.4, 92);
      const stepIdx = Math.min(
        Math.floor((progress / 92) * (GENERATION_STEPS.length - 1)),
        GENERATION_STEPS.length - 1
      );
      setVideoState({ phase: "generating", progress, step: GENERATION_STEPS[stepIdx] });
    }, 600);

    try {
      const token = getToken();
      const res = await fetch("/api/videos/generate-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          doctorName: values.name,
          designation: values.specialization,
          language: values.language,
          imageBase64,
        }),
      });

      if (progressTimerRef.current) { clearInterval(progressTimerRef.current); progressTimerRef.current = null; }

      const data = await res.json();

      if (!res.ok) {
        setVideoState({
          phase: "error",
          message: data.code === "MASTER_VIDEO_MISSING"
            ? `Master video not configured for "${values.language}".`
            : data.error || "Video generation failed.",
        });
        return;
      }

      setVideoState({ phase: "done", videoUrl: data.videoUrl, processingTime: data.processingTime });
      toast.success("Video generated! You can now submit the doctor.");
    } catch {
      if (progressTimerRef.current) { clearInterval(progressTimerRef.current); progressTimerRef.current = null; }
      setVideoState({ phase: "error", message: "Network error. Please try again." });
    }
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!videoGenerated) { toast.error("Please generate the campaign video first."); return; }
    createDoctor.mutate({ data: { ...values, imageUrl: imageBase64 || undefined } });
  }

  const watchedName = form.watch("name");
  const watchedSpec  = form.watch("specialization");
  const watchedLang  = form.watch("language");
  const canGenerate  = !!imageBase64 && !!watchedName && !!watchedSpec && !!watchedLang;
  const isGenerating = videoState.phase === "generating";

  return (
    <div className="max-w-2xl mx-auto space-y-6 px-4 sm:px-0">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Add Doctor</h1>
        <p className="text-muted-foreground text-sm">
          Complete all steps: fill details → upload photo → generate video → submit.
        </p>
      </div>

      {/* Step progress */}
      <div className="flex items-center gap-2 text-xs font-medium">
        <StepPill n={1} label="Doctor Details" done={!!watchedName && !!watchedSpec && !!form.watch("city") && !!form.watch("contactNumber")} />
        <div className="h-px flex-1 bg-border" />
        <StepPill n={2} label="Upload Photo" done={!!imageBase64} />
        <div className="h-px flex-1 bg-border" />
        <StepPill n={3} label="Generate Video" done={videoGenerated} />
        <div className="h-px flex-1 bg-border" />
        <StepPill n={4} label="Submit" done={false} active={videoGenerated} />
      </div>

      {/* ── Card 1: Doctor Information ── */}
      <Card>
        <CardHeader>
          <CardTitle>Doctor Information</CardTitle>
          <CardDescription>Fill in the doctor's details and upload their photo.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" id="add-doctor-form">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Doctor Name *</FormLabel>
                  <FormControl><Input placeholder="Dr. John Doe" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="specialization" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specialization *</FormLabel>
                    <FormControl><Input placeholder="Hepatologist" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem>
                    <FormLabel>City *</FormLabel>
                    <FormControl><Input placeholder="Mumbai" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="contactNumber" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Number *</FormLabel>
                    <FormControl><Input placeholder="+91 9876543210" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="language" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Video Language *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select language" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {LANGUAGES.map(lang => (
                          <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {/* Photo Upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Doctor Photo *</label>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />

                {imagePreview ? (
                  <div className="flex items-start gap-4">
                    <div className="relative w-28 h-28 rounded-xl overflow-hidden border-2 border-primary/30 group flex-shrink-0">
                      <img src={imagePreview} alt="Doctor preview" className="w-full h-full object-cover" />
                      <button type="button" onClick={removeImage}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                        <X className="w-6 h-6 text-white" />
                      </button>
                    </div>
                    <div className="flex flex-col gap-2 pt-1">
                      <Badge variant="secondary" className="w-fit text-xs bg-green-100 text-green-700 border-green-200">
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Photo ready
                      </Badge>
                      <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                        <RefreshCw className="w-3 h-3 mr-1" /> Change
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/30 rounded-xl cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors">
                      <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Click to upload photo</p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                      <Upload className="w-4 h-4 mr-2" /> Choose Photo
                    </Button>
                  </div>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* ── Card 2: Generate Campaign Video ── */}
      <Card className={`border-2 transition-colors ${videoGenerated ? "border-green-400/50" : "border-[#7A1512]/20"}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Film className={`w-5 h-5 ${videoGenerated ? "text-green-600" : "text-[#7A1512]"}`} />
            <CardTitle className="text-lg">Generate Campaign Video</CardTitle>
            {videoGenerated && (
              <Badge className="ml-auto bg-green-100 text-green-700 border-green-200 text-xs">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Generated
              </Badge>
            )}
          </div>
          <CardDescription>
            Generate the personalized Defeat Hepatitis video using the photo and details above.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Readiness checklist */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <ReadinessItem label="Name" ok={!!watchedName} />
            <ReadinessItem label="Specialization" ok={!!watchedSpec} />
            <ReadinessItem label="Photo" ok={!!imageBase64} />
          </div>

          {watchedLang && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Video className="w-4 h-4" />
              Language: <strong>{watchedLang}</strong>
            </p>
          )}

          {/* idle */}
          {videoState.phase === "idle" && (
            <Button type="button" onClick={handleGenerateVideo} disabled={!canGenerate}
              className="w-full sm:w-auto bg-[#7A1512] hover:bg-[#5a0f0d] text-white disabled:opacity-50">
              <Play className="w-4 h-4 mr-2" /> Generate Video
            </Button>
          )}

          {/* generating */}
          {isGenerating && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-[#7A1512] flex-shrink-0" />
                <span className="text-sm font-medium text-[#7A1512]">{videoState.phase === "generating" ? videoState.step : ""}</span>
              </div>
              <Progress value={videoState.phase === "generating" ? videoState.progress : 0} className="h-2" />
              <p className="text-xs text-muted-foreground">Takes 15–45 seconds. Keep this page open.</p>
            </div>
          )}

          {/* error */}
          {videoState.phase === "error" && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{videoState.message}</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={handleGenerateVideo} disabled={!canGenerate}>
                <RefreshCw className="w-4 h-4 mr-2" /> Try Again
              </Button>
            </div>
          )}

          {/* done */}
          {videoState.phase === "done" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle2 className="w-4 h-4" />
                <span>Generated in {videoState.processingTime} — preview below.</span>
              </div>
              <div className="rounded-xl overflow-hidden bg-black border border-border shadow">
                <video key={videoState.videoUrl} controls playsInline
                  className="w-full object-contain"
                  style={{ maxHeight: "min(400px, 55vw)", aspectRatio: "9/16" }}>
                  <source src={videoState.videoUrl} type="video/mp4" />
                </video>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" asChild>
                  <a href={videoState.videoUrl} download>
                    <Download className="w-4 h-4 mr-2" /> Download Video
                  </a>
                </Button>
                <Button type="button" variant="ghost" size="sm"
                  onClick={() => setVideoState({ phase: "idle" })}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Regenerate
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Submit Doctor ── */}
      <Card className={`border-2 transition-colors ${videoGenerated ? "border-[#7A1512]/30" : "border-muted/50 opacity-60"}`}>
        <CardContent className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5">
          <div>
            <p className="font-semibold text-sm">
              {videoGenerated ? "Ready to submit!" : "Complete video generation to submit"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {videoGenerated
                ? "Doctor record will be saved and appear in My Doctors."
                : "The Submit Doctor button unlocks after the video is generated."}
            </p>
          </div>
          <Button
            type="submit"
            form="add-doctor-form"
            disabled={!videoGenerated || createDoctor.isPending}
            className="bg-[#7A1512] hover:bg-[#5a0f0d] text-white px-8 w-full sm:w-auto flex-shrink-0 disabled:opacity-40"
          >
            {createDoctor.isPending ? (
              <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
            ) : !videoGenerated ? (
              <><Lock className="mr-2 h-4 w-4" /> Submit Doctor</>
            ) : (
              <><Upload className="mr-2 h-4 w-4" /> Submit Doctor</>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function StepPill({ n, label, done, active }: { n: number; label: string; done: boolean; active?: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
      done ? "bg-green-100 text-green-700" : active ? "bg-[#7A1512]/10 text-[#7A1512]" : "bg-muted text-muted-foreground"
    }`}>
      <span className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
        done ? "bg-green-600 text-white" : active ? "bg-[#7A1512] text-white" : "bg-muted-foreground/30 text-muted-foreground"
      }`}>
        {done ? "✓" : n}
      </span>
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}

function ReadinessItem({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={`flex items-center gap-1.5 text-xs rounded-md px-2 py-1.5 border ${
      ok ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-400"
         : "bg-muted border-border text-muted-foreground"
    }`}>
      {ok
        ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
        : <div className="w-3.5 h-3.5 rounded-full border border-current flex-shrink-0" />
      }
      <span>{label}</span>
    </div>
  );
}
