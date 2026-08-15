import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function UnsupportedBrowser() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-8">
      <Card className="w-full max-w-md border-destructive/40">
        <CardHeader>
          <CardTitle className="text-2xl">Unsupported Browser</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-muted-foreground">
          <p>
            Quiz Night needs the File System Access API to save your quizzes, questions, and proof
            files to a folder on your computer.
          </p>
          <p className="text-foreground font-medium">
            Please open this app in Google Chrome or Microsoft Edge.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
