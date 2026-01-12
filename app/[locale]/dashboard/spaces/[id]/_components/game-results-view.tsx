"use client";

import { AlertCircle } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { GameResultWithProfile } from "@/lib/actions/game-results";
import { getGameResults } from "@/lib/actions/game-results";
import { formatDateTime } from "@/lib/utils/date-format";

interface Props {
  spaceId: string;
}

export function GameResultsView({ spaceId }: Props) {
  const t = useTranslations("GameResults");
  const locale = useLocale();
  const [results, setResults] = useState<GameResultWithProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchResults = async () => {
      setLoading(true);
      setError(null);

      const response = await getGameResults(spaceId);

      if (response.success && response.results) {
        setResults(response.results);
      } else if (response.error === "Permission denied") {
        // マップ特定のエラーを適切な翻訳文字列に
        setError(t("errorPermissionDenied"));
      } else {
        setError(response.error || t("errorFetchResults"));
      }

      setLoading(false);
    };

    fetchResults();
  }, [spaceId, t]);

  const formatPatternType = (type: string): string => {
    const validTypes = ["horizontal", "vertical", "diagonal", "multiple"];
    if (validTypes.includes(type)) {
      return t(type as "horizontal" | "vertical" | "diagonal" | "multiple");
    }
    // データベースCHECK制約により、ここには到達しないはず
    // 想定外の値が来た場合はログに記録し、安全な表示を行う
    console.error(
      "Unexpected pattern_type value encountered in GameResultsView:",
      type
    );
    return t("multiple"); // 安全なフォールバック
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">
            {t("loadingResults")}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {results.length > 0
            ? `${results.length} ${t("participant")}`
            : t("noResultsDescription")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {results.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            <p className="font-medium">{t("noResults")}</p>
            <p className="mt-2 text-sm">{t("noResultsDescription")}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("winnerName")}</TableHead>
                  <TableHead>{t("achievedPattern")}</TableHead>
                  <TableHead>{t("achievedAt")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.map((result) => (
                  <TableRow key={result.id}>
                    <TableCell className="font-medium">
                      {result.profiles?.full_name ||
                        result.profiles?.email ||
                        t("unknownUser")}
                    </TableCell>
                    <TableCell>
                      {formatPatternType(result.pattern_type)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDateTime(result.achieved_at, locale)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
