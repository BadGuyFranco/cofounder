const ROLE_WEIGHTS = {
  primary: 25,
  independent_reporting: 20,
  expert_analysis: 18,
  curated: 16,
  community: 12,
  social_signal: 10,
  discovery: 6
};

export function rankCandidates(candidates, request) {
  const now = new Date(request.timebox.to);

  return candidates.map((candidate) => {
    const reasons = [];
    let score = 0;

    const roleScore = ROLE_WEIGHTS[candidate.source_role] || 5;
    score += roleScore;
    reasons.push(`source_role:${candidate.source_role}`);

    if (candidate.matched_topics.length > 0) {
      score += Math.min(30, candidate.matched_topics.length * 10);
      reasons.push('topic_match');
    }

    if (candidate.published_at) {
      const ageHours = Math.max(0, (now - new Date(candidate.published_at)) / 36e5);
      if (ageHours <= 24) {
        score += 20;
        reasons.push('recent:24h');
      } else if (ageHours <= 72) {
        score += 14;
        reasons.push('recent:72h');
      } else if (ageHours <= 168) {
        score += 8;
        reasons.push('recent:week');
      }
    } else {
      reasons.push('date_missing');
    }

    if (candidate.summary && candidate.summary.length > 120) {
      score += 8;
      reasons.push('summary_detail');
    }

    if (candidate.content && candidate.content.length > 500) {
      score += 8;
      reasons.push('content_detail');
    }

    if (candidate.author) {
      score += 4;
      reasons.push('author_present');
    }

    return {
      ...candidate,
      score,
      score_reasons: reasons
    };
  }).sort((a, b) => b.score - a.score);
}
