import { describe, expect, it } from "vitest";
import type { Participant } from "../_hooks/use-participants";
import { updateParticipantList } from "../participants-status";

describe("ParticipantsStatus - updateParticipantList", () => {
  it("ビンゴステータスを更新する", () => {
    const participants: Participant[] = [
      {
        bingo_status: "none",
        id: "participant-1",
        joined_at: "2024-01-01T00:00:00Z",
        profiles: { avatar_url: null, full_name: "参加者1" },
        user_id: "user-1",
      },
    ];

    const result = updateParticipantList(
      participants,
      "participant-1",
      "bingo"
    );

    expect(result[0].bingo_status).toBe("bingo");
  });

  it("プロフィール情報を更新する", () => {
    const participants: Participant[] = [
      {
        bingo_status: "none",
        id: "participant-1",
        joined_at: "2024-01-01T00:00:00Z",
        profiles: { avatar_url: null, full_name: "参加者1" },
        user_id: "user-1",
      },
    ];

    const newProfile = { avatar_url: null, full_name: "更新された参加者1" };
    const result = updateParticipantList(
      participants,
      "participant-1",
      "reach",
      newProfile
    );

    expect(result[0].profiles?.full_name).toBe("更新された参加者1");
    expect(result[0].bingo_status).toBe("reach");
  });

  it("プロフィール情報が提供されない場合は既存のプロフィールを保持する", () => {
    const participants: Participant[] = [
      {
        bingo_status: "none",
        id: "participant-1",
        joined_at: "2024-01-01T00:00:00Z",
        profiles: { avatar_url: null, full_name: "参加者1" },
        user_id: "user-1",
      },
    ];

    const result = updateParticipantList(
      participants,
      "participant-1",
      "reach"
    );

    expect(result[0].profiles?.full_name).toBe("参加者1");
    expect(result[0].bingo_status).toBe("reach");
  });

  it("ビンゴステータスに基づいて参加者をソートする (bingo > reach > none)", () => {
    const participants: Participant[] = [
      {
        bingo_status: "none",
        id: "participant-1",
        joined_at: "2024-01-01T00:00:00Z",
        profiles: { avatar_url: null, full_name: "参加者1" },
        user_id: "user-1",
      },
      {
        bingo_status: "reach",
        id: "participant-2",
        joined_at: "2024-01-01T01:00:00Z",
        profiles: { avatar_url: null, full_name: "参加者2" },
        user_id: "user-2",
      },
      {
        bingo_status: "none",
        id: "participant-3",
        joined_at: "2024-01-01T02:00:00Z",
        profiles: { avatar_url: null, full_name: "参加者3" },
        user_id: "user-3",
      },
    ];

    // participant-1をbingoに更新
    const result = updateParticipantList(
      participants,
      "participant-1",
      "bingo"
    );

    // bingo (participant-1) が最初、reach (participant-2) が2番目、none (participant-3) が最後
    expect(result[0].id).toBe("participant-1");
    expect(result[0].bingo_status).toBe("bingo");
    expect(result[1].id).toBe("participant-2");
    expect(result[1].bingo_status).toBe("reach");
    expect(result[2].id).toBe("participant-3");
    expect(result[2].bingo_status).toBe("none");
  });

  it("同じステータス内ではjoined_atの順序を保つ", () => {
    const participants: Participant[] = [
      {
        bingo_status: "reach",
        id: "participant-1",
        joined_at: "2024-01-01T02:00:00Z",
        profiles: { avatar_url: null, full_name: "参加者1" },
        user_id: "user-1",
      },
      {
        bingo_status: "reach",
        id: "participant-2",
        joined_at: "2024-01-01T01:00:00Z",
        profiles: { avatar_url: null, full_name: "参加者2" },
        user_id: "user-2",
      },
      {
        bingo_status: "reach",
        id: "participant-3",
        joined_at: "2024-01-01T00:00:00Z",
        profiles: { avatar_url: null, full_name: "参加者3" },
        user_id: "user-3",
      },
    ];

    // participant-2のステータスを変更せずに更新
    const result = updateParticipantList(
      participants,
      "participant-2",
      "reach"
    );

    // joined_atの順序で並ぶ (3, 2, 1)
    expect(result[0].id).toBe("participant-3");
    expect(result[1].id).toBe("participant-2");
    expect(result[2].id).toBe("participant-1");
  });

  it("存在しない参加者IDの場合は元のリストを返す", () => {
    const participants: Participant[] = [
      {
        bingo_status: "none",
        id: "participant-1",
        joined_at: "2024-01-01T00:00:00Z",
        profiles: { avatar_url: null, full_name: "参加者1" },
        user_id: "user-1",
      },
    ];

    const result = updateParticipantList(
      participants,
      "nonexistent-id",
      "bingo"
    );

    expect(result).toEqual(participants);
  });

  it("プロフィールがnullの場合でも正しく処理する", () => {
    const participants: Participant[] = [
      {
        bingo_status: "none",
        id: "participant-1",
        joined_at: "2024-01-01T00:00:00Z",
        profiles: null,
        user_id: "user-1",
      },
    ];

    const newProfile = { avatar_url: null, full_name: "新規参加者" };
    const result = updateParticipantList(
      participants,
      "participant-1",
      "reach",
      newProfile
    );

    expect(result[0].profiles?.full_name).toBe("新規参加者");
    expect(result[0].bingo_status).toBe("reach");
  });

  it("複雑なシナリオ: 複数の参加者が異なるステータスでソートされる", () => {
    const participants: Participant[] = [
      {
        bingo_status: "none",
        id: "participant-1",
        joined_at: "2024-01-01T00:00:00Z",
        profiles: { avatar_url: null, full_name: "参加者1" },
        user_id: "user-1",
      },
      {
        bingo_status: "bingo",
        id: "participant-2",
        joined_at: "2024-01-01T01:00:00Z",
        profiles: { avatar_url: null, full_name: "参加者2" },
        user_id: "user-2",
      },
      {
        bingo_status: "reach",
        id: "participant-3",
        joined_at: "2024-01-01T02:00:00Z",
        profiles: { avatar_url: null, full_name: "参加者3" },
        user_id: "user-3",
      },
      {
        bingo_status: "none",
        id: "participant-4",
        joined_at: "2024-01-01T03:00:00Z",
        profiles: { avatar_url: null, full_name: "参加者4" },
        user_id: "user-4",
      },
    ];

    // participant-4をreachに更新
    const result = updateParticipantList(
      participants,
      "participant-4",
      "reach",
      { avatar_url: null, full_name: "更新された参加者4" }
    );

    // 期待される順序: bingo (2), reach (3, 4), none (1)
    expect(result[0].id).toBe("participant-2");
    expect(result[0].bingo_status).toBe("bingo");
    expect(result[1].id).toBe("participant-3");
    expect(result[1].bingo_status).toBe("reach");
    expect(result[2].id).toBe("participant-4");
    expect(result[2].bingo_status).toBe("reach");
    expect(result[2].profiles?.full_name).toBe("更新された参加者4");
    expect(result[3].id).toBe("participant-1");
    expect(result[3].bingo_status).toBe("none");
  });
});
