# Domain Dictionary

이 프로젝트(DunbarHorizon)에서 사용되는 핵심 도메인 용어와 매핑된 영문 변수명이다. 코드를 작성할 때 반드시 아래의 용어를 준수해.

## 1. 소셜 그래프 관련 (Social Graph)

| 개념 (Korean)  | 변수명/타입 (English) | 설명 (Description)                                                           |
| :------------- | :-------------------- | :--------------------------------------------------------------------------- |
| 친구 상세 정보 | `FriendshipDetail`    | 노드 렌더링의 기본 데이터 모델 (백엔드 공통)                                 |
| 네트워크 엣지  | `NetworkFriendEdge`   | 친구 간의 관계를 나타내는 데이터 모델                                        |
| 친구 식별자    | `friendId`            | 친구 고유 번호 (백엔드 Long 대응). 노드 ID 등록 시에는 String으로 변환.      |
| 표시 이름      | `label`               | 그래프 노드 상단의 텍스트. `friendAlias` 우선, 없으면 `friendNickname` 사용. |
| 친밀도         | `intimacy`            | 노드 간 사회적 거리를 나타내는 핵심 지표                                     |
| 내 관심도      | `interest`            | `myInterestScore`를 기반으로 한 사용자 관심 지표                             |
| 공통 친구 수   | `mutualCount`         | 관계망 내에서 공유하는 친구의 수                                             |
| 뮤트 여부      | `isMuted`             | 그래프 상에서 노드를 흐리게 하거나 제외할지 결정하는 플래그                  |

## 2. 라벨링 및 관리 관련 (Labeling)

| 개념 (Korean)  | 변수명/타입 (English)   | 설명 (Description)                               |
| :------------- | :---------------------- | :----------------------------------------------- |
| 라벨           | `Label`                 | 친구들을 그룹화하기 위한 분류 도메인             |
| 라벨 이름      | `labelName`             | 사용자가 정의한 라벨 명칭 (최대 20자)            |
| 노출 여부      | `exposure`              | 타인에게 해당 라벨 정보를 공개할지 여부          |
| 라벨 멤버      | `memberId`              | 특정 라벨에 포함된 친구의 ID (`friendId`와 매핑) |
| 라벨 생성 요청 | `LabelCreateRequest`    | 라벨 생성을 위한 DTO 명칭                        |
| 멤버 추가 요청 | `LabelMemberAddRequest` | 라벨에 친구를 추가하기 위한 DTO 명칭             |
