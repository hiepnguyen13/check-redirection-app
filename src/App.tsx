import { useRef, useState } from "react";

interface ResultRow {
  line: number;
  existingUrl: string;
  recommendedUrl: string;
  existingUrlError: string;
  recommendedUrlError: string;
  status: string;
}

function App() {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const outputRef = useRef<HTMLTextAreaElement>(null);
  const [error, setError] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [results, setResults] = useState<ResultRow[]>([]);

  const openAllLinks = () => {
    if (inputRef.current) {
      const inputText = inputRef.current.value.trim();
      const links = inputText
        .split(/\s+|\n+/)
        .filter((link) => link.trim() !== "");
      links.forEach((link) => {
        let url = link;
        if (!/^https?:\/\//i.test(link)) {
          url = `https://${link}`;
        }
        try {
          const finalUrl = url;
          window.open(finalUrl, "_blank", "noopener,noreferrer");
        } catch (e) {
          console.error(e);
          console.warn(`Invalid URL: ${link}`);
        }
      });
    }
  };

  const checkRedirectUrls = async () => {
    setIsLoading(true);
    setProgress(0);
    setError("");
    setResults([]);

    try {
      if (!inputRef.current || !outputRef.current) {
        setError("Input or output textarea is missing");
        return;
      }

      const inputText = inputRef.current.value.trim();
      const inputLines = inputText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "");

      if (inputLines.length === 0) {
        setError("All Existing URLs textarea is empty");
        return;
      }

      const outputText = outputRef.current.value.trim();
      const originalOutputLines = outputText
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== "")
        .map((line) => decodeURIComponent(line));

      if (originalOutputLines.length === 0) {
        setError("All recommended URLs textarea is empty");
        return;
      }

      const outputLines = [...originalOutputLines];

      const resultRows: ResultRow[] = [];
      const totalUrls = inputLines.length;
      const progressIncrement = 100 / totalUrls;

      for (let i = 0; i < inputLines.length; i++) {
        let url = inputLines[i];
        let displayUrl = url; // Original URL for table
        if (!/^https?:\/\//i.test(url)) {
          url = `https://${url}`;
          displayUrl = url;
        }

        let status = "success";
        let existingUrlError = "";
        let recommendedUrlError = "";
        let finalUrl = "";
        const recommendedUrl =
          decodeURIComponent(outputLines[i]) || "(no recommended URL)";
        const displayRecommendedUrl =
          originalOutputLines[i] || "(no recommended URL)";

        try {
          new URL(url);
          const response = await fetch(url, { redirect: "follow" });
          if (response.status === 200) {
            finalUrl = decodeURIComponent(response.url);
            if (i < outputLines.length && finalUrl !== recommendedUrl) {
              status = "error";
              recommendedUrlError = `Redirect URL "${finalUrl}" does not match Recommended URL "${recommendedUrl}"`;
            }
          } else {
            status = "error";
            existingUrlError = `Returned status ${response.status}`;
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (e: any) {
          console.error(`Fetch error for URL "${url}":`, e);
          status = "error";
          let errorMessage = `Failed to fetch`;
          if (e.name === "TypeError" && e.message.includes("Failed to fetch")) {
            errorMessage += " (possible CORS issue or network error)";
          } else if (e instanceof SyntaxError) {
            errorMessage += " (invalid URL format)";
          } else {
            errorMessage += ` (${e.message})`;
          }
          existingUrlError = errorMessage;
        }

        resultRows.push({
          line: i + 1,
          existingUrl: displayUrl,
          recommendedUrl: displayRecommendedUrl,
          existingUrlError,
          recommendedUrlError,
          status,
        });

        setProgress((i + 1) * progressIncrement);
      }

      if (inputLines.length !== outputLines.length) {
        resultRows.push({
          line: Math.max(inputLines.length, outputLines.length),
          existingUrl:
            inputLines.length > outputLines.length
              ? inputLines[outputLines.length] || ""
              : "",
          recommendedUrl:
            originalOutputLines.length > inputLines.length
              ? originalOutputLines[inputLines.length] || ""
              : "",
          existingUrlError: "",
          recommendedUrlError: `Length mismatch: ${inputLines.length} existing URLs vs ${originalOutputLines.length} recommended URLs`,
          status: "error",
        });
      }
      setResults(resultRows);
    } finally {
      setIsLoading(false);
      setProgress(100);
    }
  };

  return (
    <div className="container py-5">
      <h1 className="pb-3">Check redirection app</h1>

      <div className="container d-flex gap-3 mt-3">
        <div className="flex-grow-1 w-50">
          <div className="mb-3">
            <label htmlFor="input-links" className="form-label h4">
              All Existing URLs
            </label>
            <textarea
              className="form-control"
              id="input-links"
              style={{ minHeight: "55vh" }}
              ref={inputRef}
            ></textarea>
          </div>
          <button
            type="button"
            className="btn btn-primary"
            onClick={openAllLinks}
          >
            Open All Existing URLs
          </button>
        </div>
        <div className="flex-grow-1 w-50">
          <div className="mb-3">
            <label htmlFor="output-links" className="form-label h4">
              All recommended URLs
            </label>
            <textarea
              className="form-control"
              id="output-links"
              style={{ minHeight: "55vh" }}
              ref={outputRef}
            ></textarea>
          </div>
          <button
            type="button"
            className="btn btn-warning"
            onClick={checkRedirectUrls}
          >
            Check redirection
          </button>
        </div>
      </div>

      <div className="container mt-3">
        {isLoading || error || results.length ? (
          <p className="h4">Results</p>
        ) : null}

        {isLoading && (
          <div className="mt-3">
            <div className="progress">
              <div
                className="progress-bar progress-bar-striped progress-bar-animated bg-primary"
                role="progressbar"
                style={{ width: `${progress}%` }}
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                {Math.round(progress)}%
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="alert alert-danger mt-3" role="alert">
            {error}
          </div>
        )}

        {!!results.length &&
          results.every((result) => result.status === "success") && (
            <div className="alert alert-success mt-3" role="alert">
              All URLs match!
            </div>
          )}

        {!!results.length &&
          results.some((result) => result.status !== "success") && (
            <div className="alert alert-danger mt-3" role="alert">
              Errors or mismatches found!
            </div>
          )}

        {results.length > 0 && (
          <div className="mt-3">
            <table className="table table-bordered">
              <thead>
                <tr className="table-dark">
                  <th scope="col">Line</th>
                  <th scope="col">All Existing URLs</th>
                  <th scope="col">All recommended URLs</th>
                </tr>
              </thead>
              <tbody>
                {results.map((row) => (
                  <tr
                    key={row.line}
                    className={
                      row.status === "success"
                        ? "table-success"
                        : "table-danger"
                    }
                  >
                    <td>{row.line}</td>
                    <td>
                      {row.existingUrl}
                      {row.existingUrlError && (
                        <p className="h5 text-danger">
                          {" (" + row.existingUrlError + ")"}
                        </p>
                      )}
                    </td>
                    <td>
                      {row.recommendedUrl}
                      {row.recommendedUrlError && (
                        <p className="h5 text-danger">
                          {" (" + row.recommendedUrlError + ")"}
                        </p>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
