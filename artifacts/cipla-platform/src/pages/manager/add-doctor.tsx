import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateDoctor } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Loader2, Upload, ImageIcon, X, Video, Play, AlertCircle,
  CheckCircle2, Film, RefreshCw, Download
} from "lucide-react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription
} from "@/components/ui/card";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
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

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      specialization: "",
      city: "",
      contactNumber: "",
      language: "",
      imageUrl: "",
    },
  });

  const createDoctor = useCreateDoctor({
    mutation: {
      onSuccess: () => {
        toast.success("Doctor added successfully!");
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
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
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
      toast.error("Please fill in Doctor Name, Specialization, and Language first.");
      return;
    }

    setVideoState({ phase: "generating", progress: 0, step: GENERATION_STEPS[0] });

    let stepIdx = 0;
    let progress = 0;
    progressTimerRef.current = setInterval(() => {
      progress = Math.min(progress + 1.2, 92);
      stepIdx = Math.floor((progress / 92) * (GENERATION_STEPS.length - 1));
      setVideoState({
        phase: "generating",
        progress,
        step: GENERATION_STEPS[Math.min(stepIdx, GENERATION_STEPS.length - 1)],
      });
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

      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }

      const data = await res.json();

      if (!res.ok) {
        if (data.code === "MASTER_VIDEO_MISSING") {
          setVideoState({
            phase: "error",
            message: `Master video not found for "${values.language}". Please upload the language master video file to the server's videos/ folder.`,
          });
        } else {
          setVideoState({ phase: "error", message: data.error || "Video generation failed." });
        }
        return;
      }

      setVideoState({
        phase: "done",
        videoUrl: data.videoUrl,
        processingTime: data.processingTime,
      });
      toast.success("Video generated successfully!");
    } catch {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      setVideoState({ phase: "error", message: "Network error. Please try again." });
    }
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    createDoctor.mutate({
      data: {
        ...values,
        imageUrl: imageBase64 || undefined,
      },
    });
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
        <p className="text-muted-foreground text-sm sm:text-base">
          Register a new doctor and generate their personalized campaign video.
        </p>
      </div>

      {/* ── Doctor Information Card ── */}
      <Card>
        <CardHeader>
          <CardTitle>Doctor Information</CardTitle>
          <CardDescription>Fill in the details below, upload a photo, then generate the video.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

              {/* Name */}
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Doctor Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="Dr. John Doe" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Specialization + City */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="specialization"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Specialization *</FormLabel>
                      <FormControl>
                        <Input placeholder="Hepatologist" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City *</FormLabel>
                      <FormControl>
                        <Input placeholder="Mumbai" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Contact + Language */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="contactNumber"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Number *</FormLabel>
                      <FormControl>
                        <Input placeholder="+91 9876543210" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="language"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Video Language *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select language" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {LANGUAGES.map(lang => (
                            <SelectItem key={lang} value={lang}>{lang}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Photo Upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Doctor Photo *</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />

                {imagePreview ? (
                  <div className="flex items-start gap-4">
                    <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-xl overflow-hidden border-2 border-primary/30 group flex-shrink-0">
                      <img
                        src={imagePreview}
                        alt="Doctor preview"
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={removeImage}
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                      >
                        <X className="w-6 h-6 text-white" />
                      </button>
                    </div>
                    <div className="flex flex-col gap-2 pt-1">
                      <Badge variant="secondary" className="w-fit text-xs">Photo ready</Badge>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <RefreshCw className="w-3 h-3 mr-1" /> Change Photo
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-muted-foreground/30 rounded-xl cursor-pointer hover:border-primary/50 hover:bg-muted/30 transition-colors"
                    >
                      <ImageIcon className="w-8 h-8 text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">Click to upload photo</p>
                      <p className="text-xs text-muted-foreground mt-1">PNG, JPG up to 5MB</p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="w-4 h-4 mr-2" /> Choose Photo
                    </Button>
                  </div>
                )}
              </div>

              {/* Submit */}
              <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4 border-t">
                <Button
                  type="submit"
                  disabled={createDoctor.isPending}
                  className="bg-[#7A1512] hover:bg-[#5a0f0d] text-white px-8 w-full sm:w-auto"
                >
                  {createDoctor.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving…</>
                  ) : (
                    <><Upload className="mr-2 h-4 w-4" /> Upload Doctor</>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* ── Video Generation Card ── */}
      <Card className="border-2 border-[#7A1512]/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-[#7A1512]" />
            <CardTitle className="text-lg">Generate Campaign Video</CardTitle>
          </div>
          <CardDescription>
            Generate a personalized Defeat Hepatitis video for this doctor using the uploaded photo and details above.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Readiness checklist */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
            <ReadinessItem label="Doctor Name" ok={!!watchedName} />
            <ReadinessItem label="Specialization" ok={!!watchedSpec} />
            <ReadinessItem label="Photo uploaded" ok={!!imageBase64} />
          </div>

          {/* Language badge */}
          {watchedLang && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Video className="w-4 h-4" />
              <span>Video will be generated in <strong>{watchedLang}</strong></span>
            </div>
          )}

          {/* idle state */}
          {videoState.phase === "idle" && (
            <Button
              type="button"
              onClick={handleGenerateVideo}
              disabled={!canGenerate}
              className="w-full sm:w-auto bg-[#7A1512] hover:bg-[#5a0f0d] text-white disabled:opacity-50"
            >
              <Play className="w-4 h-4 mr-2" />
              Generate Video Preview
            </Button>
          )}

          {/* generating state */}
          {videoState.phase === "generating" && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 animate-spin text-[#7A1512] flex-shrink-0" />
                <span className="text-sm font-medium text-[#7A1512]">{videoState.step}</span>
              </div>
              <Progress value={videoState.progress} className="h-2" />
              <p className="text-xs text-muted-foreground">
                Video generation typically takes 30–60 seconds. Please keep this page open.
              </p>
            </div>
          )}

          {/* error state */}
          {videoState.phase === "error" && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                <AlertCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <p className="text-sm text-destructive">{videoState.message}</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleGenerateVideo}
                disabled={!canGenerate}
              >
                <RefreshCw className="w-4 h-4 mr-2" /> Try Again
              </Button>
            </div>
          )}

          {/* done state */}
          {videoState.phase === "done" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>Video generated in {videoState.processingTime}</span>
              </div>

              {/* Video player */}
              <div className="relative rounded-xl overflow-hidden bg-black border border-border shadow-md">
                <video
                  key={videoState.videoUrl}
                  controls
                  playsInline
                  className="w-full max-h-[480px] object-contain"
                  style={{ aspectRatio: "9/16", maxHeight: "min(480px, 60vw)" }}
                >
                  <source src={videoState.videoUrl} type="video/mp4" />
                  Your browser does not support video playback.
                </video>
              </div>

              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a href={videoState.videoUrl} download>
                    <Download className="w-4 h-4 mr-2" /> Download Video
                  </a>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setVideoState({ phase: "idle" })}
                >
                  <RefreshCw className="w-4 h-4 mr-2" /> Regenerate
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReadinessItem({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className={`flex items-center gap-2 text-xs rounded-md px-2 py-1.5 border ${
      ok
        ? "bg-green-50 border-green-200 text-green-700 dark:bg-green-950 dark:border-green-800 dark:text-green-400"
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
