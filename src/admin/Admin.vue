<!--
 * @Author: your name
 * @Date: 2019-11-04 19:00:51
 * @LastEditTime: 2020-04-27 14:51:23
 * @LastEditors: Json.Xu
 * @Description: In User Settings Edit
 * @FilePath: \vue_vuetify_parseserver\src\admin\Admin.vue
 -->
<template>
  <v-app id="admin">
    <router-view></router-view>
    <LoadingCard></LoadingCard>
  </v-app>
</template>


<script>
import LoadingCard from "./components/LoadingCard";
export default {
  name: "Admin",
  components: {
    LoadingCard
  },
  data: () => ({}),
  mounted() {},
  methods: {}
};
</script>
<style scoped>
</style>

