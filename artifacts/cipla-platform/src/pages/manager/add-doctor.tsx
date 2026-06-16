import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useCreateDoctor } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import {
  Upload, ImageIcon, X, Video, AlertCircle,
  CheckCircle2, Film, RefreshCw, Download, Lock, Play, Loader2,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const SPECIALTY_OPTIONS = [
  "Consultant Gastroenterologist",
  "Senior Consultant Gastroenterologist",
  "Consultant Gastro Surgeon",
  "Consultant Hepatologist",
  "Consultant Nephrologist",
  "Consultant Physician",
  "Consultant Cardiologist",
  "Other",
];

const LANGUAGE_VIDEOS: Record<string, string> = {
  Hindi:     "/videos/hindi.mp4",
  English:   "/videos/english.mp4",
  Marathi:   "/videos/marathi.mp4",
  Gujarati:  "/videos/gujarati.mp4",
  Telugu:    "/videos/telugu.mp4",
  Tamil:     "/videos/tamil.mp4",
  Punjabi:   "/videos/punjabi.mp4",
  Oriya:     "/videos/oriya.mp4",
  Malayalam: "/videos/malayalam.mp4",
  Kannada:   "/videos/kannada.mp4",
  Bengali:   "/videos/bengali.mp4",
};

const LANGUAGES = Object.keys(LANGUAGE_VIDEOS);

const formSchema = z.object({
  name:           z.string().min(2, "Name must be at least 2 characters"),
  specialization: z.string().min(2, "Specialty is required"),
  city:           z.string().min(2, "City is required"),
  language:       z.string().min(1, "Language is required"),
  imageUrl:       z.string().optional(),
});

type VideoState =
  | { phase: "idle" }
  | { phase: "loading" }
  | { phase: "done"; videoUrl: string; language: string }
  | { phase: "error"; message: string };

export default function ManagerAddDoctor() {
  const [, setLocation] = useLocation();
  const [imagePreview, setImagePreview]   = useState<string | null>(null);
  const [imageBase64, setImageBase64]     = useState<string | null>(null);
  const [videoState, setVideoState]       = useState<VideoState>({ phase: "idle" });
  const [selectedSpecialty, setSelectedSpecialty] = useState("");
  const [specialtyOther, setSpecialtyOther]       = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const videoGenerated = videoState.phase === "done";

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: "", specialization: "", city: "", language: "", imageUrl: "" },
  });

  const createDoctor = useCreateDoctor({
    mutation: {
      onSuccess: () => {
        toast.success("Doctor submitted successfully!");
        setLocation("/manager/doctors");
      },
      onError: (err: any) => {
        const msg = err?.data?.error || "Failed to add doctor.";
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

  function handleSpecialtyChange(val: string) {
    setSelectedSpecialty(val);
    if (val !== "Other") {
      form.setValue("specialization", val, { shouldValidate: true });
      setSpecialtyOther("");
    } else {
      form.setValue("specialization", specialtyOther, { shouldValidate: false });
    }
  }

  function handleOtherChange(val: string) {
    setSpecialtyOther(val);
    form.setValue("specialization", val, { shouldValidate: true });
  }

  function handleLanguageChange(val: string) {
    form.setValue("language", val, { shouldValidate: true });
    setVideoState({ phase: "idle" });
  }

  function handleGenerateVideo() {
    const values = form.getValues();
    if (!values.name || !values.specialization) {
      toast.error("Please fill in Name and Specialty first.");
      return;
    }
    const lang = values.language;
    const videoUrl = LANGUAGE_VIDEOS[lang];
    if (!videoUrl) {
      setVideoState({ phase: "error", message: `No video template available for "${lang}". Please choose another language.` });
      return;
    }
    setVideoState({ phase: "loading" });
    setTimeout(() => {
      setVideoState({ phase: "done", videoUrl, language: lang });
      toast.success(`${lang} campaign video ready!`);
    }, 800);
  }

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!videoGenerated) { toast.error("Please generate the campaign video first."); return; }
    createDoctor.mutate({ data: { ...values, imageUrl: imageBase64 || undefined } });
  }

  const watchedName = form.watch("name");
  const watchedSpec = form.watch("specialization");
  const watchedLang = form.watch("language");
  const watchedCity = form.watch("city");
  const canGenerate = !!watchedName && !!watchedSpec && !!watchedLang;
  const isLoading   = videoState.phase === "loading";

  return (
    <div className="max-w-2xl mx-auto space-y-6 px-4 sm:px-0">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Add Doctor</h1>
        <p className="text-muted-foreground text-sm">
          Fill in details → select language → generate video → submit.
        </p>
      </div>

      {/* Step pills */}
      <div className="flex items-center gap-2 text-xs font-medium">
        <StepPill n={1} label="Doctor Details" done={!!watchedName && !!watchedSpec && !!watchedCity} />
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

              {/* Specialty dropdown */}
              <FormField control={form.control} name="specialization" render={() => (
                <FormItem>
                  <FormLabel>Specialty *</FormLabel>
                  <Select onValueChange={handleSpecialtyChange} value={selectedSpecialty}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select specialty" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {SPECIALTY_OPTIONS.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {selectedSpecialty === "Other" && (
                    <Input
                      className="mt-2"
                      placeholder="Enter specialty (e.g. Consultant Diabetologist)"
                      value={specialtyOther}
                      onChange={e => handleOtherChange(e.target.value)}
                    />
                  )}
                  <FormMessage />
                </FormItem>
              )} />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem>
                    <FormLabel>City *</FormLabel>
                    <FormControl><Input placeholder="Mumbai" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="language" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Video Language *</FormLabel>
                    <Select onValueChange={handleLanguageChange} value={field.value}>
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
                      <img src={imagePreview} alt="Doctor" className="w-full h-full object-cover" />
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

      {/* ── Card 2: Campaign Video ── */}
      <Card className={`border-2 transition-colors ${videoGenerated ? "border-green-400/50" : "border-[#7A1512]/20"}`}>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Film className={`w-5 h-5 ${videoGenerated ? "text-green-600" : "text-[#7A1512]"}`} />
            <CardTitle className="text-lg">Campaign Video</CardTitle>
            {videoGenerated && (
              <Badge className="ml-auto bg-green-100 text-green-700 border-green-200 text-xs">
                <CheckCircle2 className="w-3 h-3 mr-1" /> Ready
              </Badge>
            )}
          </div>
          <CardDescription>
            Select a language above and click Generate Video to load the campaign template.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">

          {/* Readiness checklist */}
          <div className="grid grid-cols-3 gap-2 text-xs">
            <ReadinessItem label="Name"       ok={!!watchedName} />
            <ReadinessItem label="Specialty"  ok={!!watchedSpec} />
            <ReadinessItem label="Language"   ok={!!watchedLang} />
          </div>

          {watchedLang && (
            <p className="text-sm text-muted-foreground flex items-center gap-1.5">
              <Video className="w-4 h-4" />
              Language selected: <strong>{watchedLang}</strong>
            </p>
          )}

          {/* Generate button — idle or after error/regenerate */}
          {(videoState.phase === "idle" || videoState.phase === "error") && (
            <div className="space-y-3">
              {videoState.phase === "error" && (
                <div className="flex items-start gap-3 rounded-lg bg-destructive/10 border border-destructive/20 p-3">
                  <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-destructive">{videoState.message}</p>
                </div>
              )}
              <Button type="button" onClick={handleGenerateVideo} disabled={!canGenerate}
                className="w-full sm:w-auto bg-[#7A1512] hover:bg-[#5a0f0d] text-white disabled:opacity-50">
                <Play className="w-4 h-4 mr-2" /> Generate Video
              </Button>
            </div>
          )}

          {/* Loading spinner */}
          {isLoading && (
            <div className="flex items-center gap-3 py-2">
              <Loader2 className="w-5 h-5 animate-spin text-[#7A1512]" />
              <span className="text-sm text-[#7A1512] font-medium">Loading {watchedLang} template…</span>
            </div>
          )}

          {/* Video player */}
          {videoState.phase === "done" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <CheckCircle2 className="w-4 h-4" />
                <span><strong>{videoState.language}</strong> campaign video loaded — preview below.</span>
              </div>
              <div className="rounded-xl overflow-hidden bg-black border border-border shadow">
                <video
                  key={videoState.videoUrl}
                  controls
                  playsInline
                  className="w-full object-contain"
                  style={{ maxHeight: "min(400px, 55vw)", aspectRatio: "9/16" }}
                >
                  <source src={videoState.videoUrl} type="video/mp4" />
                </video>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" asChild>
                  <a href={videoState.videoUrl} download>
                    <Download className="w-4 h-4 mr-2" /> Download
                  </a>
                </Button>
                <Button type="button" variant="ghost" size="sm"
                  onClick={() => setVideoState({ phase: "idle" })}>
                  <RefreshCw className="w-4 h-4 mr-2" /> Change Language
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
              {videoGenerated ? "Ready to submit!" : "Complete video step to submit"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {videoGenerated
                ? "Doctor record will be saved and appear in My Doctors."
                : "The Submit button unlocks after the video is loaded."}
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
      ok ? "bg-green-50 border-green-200 text-green-700" : "bg-muted border-border text-muted-foreground"
    }`}>
      {ok
        ? <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
        : <div className="w-3.5 h-3.5 rounded-full border border-current flex-shrink-0" />
      }
      <span>{label}</span>
    </div>
  );
}
