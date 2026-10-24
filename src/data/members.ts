export interface Member {
  id: string;
  name: string;
  role: string;
  bio: string;
  avatar: string;
  avatarDescription: string;
  tags: string[];
  experience: { title: string; text: string }[];
  links: { label: string; url: string }[];
  placeholder: boolean;
}

// Replace these explicitly marked placeholders with member-approved public profiles.
// Avatars are original illustrations, not portraits of actual association members.
const portraits = [
  "戴圆框眼镜、穿紫色卫衣的卡通人物",
  "短发、戴青色耳机的卡通人物",
  "戴青色针织帽的卡通人物",
  "扎高马尾、戴眼镜的卡通人物",
  "卷发、戴深蓝耳机的卡通人物",
  "反戴紫色棒球帽的卡通人物",
];

export const members: Member[] = portraits.map((avatarDescription, index) => {
  const id = String(index + 1).padStart(2, "0");
  return {
    id,
    name: `成员 ${id}`,
    role: "姓名与职责待补充",
    bio: "个人介绍、研究方向与共建经历，将在资料确认后展示。",
    avatar: `/images/members/avatar-${id}.webp`,
    avatarDescription,
    tags: [],
    experience: [],
    links: [],
    placeholder: true,
  };
});
