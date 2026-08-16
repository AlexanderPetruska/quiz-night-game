import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useTranslation } from "@/i18n/I18nContext";

export function UnsupportedBrowser() {
  const { t } = useTranslation();

  return (
    <div className="flex min-h-svh items-center justify-center bg-background p-8">
      <Card className="w-full max-w-md border-destructive/40">
        <CardHeader>
          <CardTitle className="text-2xl">{t("unsupportedBrowser.title")}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-muted-foreground">
          <p>{t("unsupportedBrowser.description")}</p>
          <p className="text-foreground font-medium">{t("unsupportedBrowser.notice")}</p>
        </CardContent>
      </Card>
    </div>
  );
}
