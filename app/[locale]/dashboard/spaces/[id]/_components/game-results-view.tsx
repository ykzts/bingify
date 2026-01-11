"use client";

import { AlertCircle } from "lucide-react";
import { useTranslations } from "next-intl";
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

interface Props {
  spaceId: string;
}

export function GameResultsView({ spaceId }: Props) {
  const t = useTranslations("GameResults");
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
      } else {
        setError(response.error || t("errorFetchResults"));
      }

      setLoading(false);
    };

    fetchResults();
  }, [spaceId, t]);

  const formatPatternType = (type: string): string => {
    const key = type as
      | "horizontal"
      | "vertical"
      | "diagonal"
      | "multiple"
      | "none";
    return t(key);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("ja-JP", {
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(date);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{t("title")}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground py-8">
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
          <div className="text-center text-muted-foreground py-8">
            <p className="font-medium">{t("noResults")}</p>
            <p className="text-sm mt-2">{t("noResultsDescription")}</p>
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
                      {result.profiles?.full_name || result.profiles?.email || "Unknown User"}
                    </TableCell>
                    <TableCell>
                      {formatPatternType(result.pattern_type)}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatDate(result.achieved_at)}
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
