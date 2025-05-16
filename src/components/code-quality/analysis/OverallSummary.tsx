
import { Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface OverallSummaryProps {
  careerDevelopmentSummary: string | null | undefined;
  averageScore: number;
  isGeneratingSummary: boolean;
  onGenerateSummary: () => Promise<void>;
  canGenerateSummary: boolean;
}

export default function OverallSummary({
  careerDevelopmentSummary,
  averageScore,
  isGeneratingSummary,
  onGenerateSummary,
  canGenerateSummary,
}: OverallSummaryProps) {
  const scorePercentage = (averageScore / 10) * 100;
  let progressBarColor = "bg-red-500";
  if (averageScore >= 8) {
    progressBarColor = "bg-green-500";
  } else if (averageScore >= 6) {
    progressBarColor = "bg-yellow-500";
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Career Development Assessment</CardTitle>
        <CardDescription>
          Overall code quality score based on selected PRs.
        </CardDescription>
        <div className="mt-2 flex items-center space-x-2 pt-2">
          <Progress value={scorePercentage} className="flex-1 h-2">
            <div
              className={`h-full ${progressBarColor}`}
              style={{ width: `${scorePercentage}%` }}
            />
          </Progress>
          <span className="text-sm font-medium text-muted-foreground">
            {averageScore.toFixed(1)}/10
          </span>
        </div>
      </CardHeader>
      <CardContent className="min-h-[80px]">
        {isGeneratingSummary ? (
          <div className="flex items-center justify-center text-muted-foreground space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Generating AI summary...</span>
          </div>
        ) : careerDevelopmentSummary ? (
          <p className="text-sm text-muted-foreground">
            {careerDevelopmentSummary}
          </p>
        ) : canGenerateSummary ? (
          <p className="text-sm text-muted-foreground italic text-center">
            Generate an AI summary based on the selected PRs below.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground italic text-center">
            Configure your OpenAI API Key in settings to enable summary
            generation.
          </p>
        )}
      </CardContent>
      {!careerDevelopmentSummary && canGenerateSummary && (
        <CardFooter className="border-t pt-4">
          <Button
            onClick={onGenerateSummary}
            disabled={isGeneratingSummary}
            className="w-full"
          >
            <Sparkles className="mr-2 h-4 w-4" />
            Generate Summary
            {isGeneratingSummary && (
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
